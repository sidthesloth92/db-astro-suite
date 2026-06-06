// Package view turns a ledger into a self-contained HTML report (the viewer
// with the data inlined), opens it in the default browser, and — optionally —
// serves it from a localhost-only HTTP server. Stdlib only.
package view

import (
	"context"
	"fmt"
	"net"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
)

// ledgerPlaceholder is the exact token in viewer/index.html that the inlined
// ledger JSON replaces: `window.__LEDGER__ = /*__CELESTORY_DATA__*/null;`.
const ledgerPlaceholder = "/*__CELESTORY_DATA__*/null"

// BuildHTML returns the viewer template with the ledger JSON inlined. The JSON
// must already be HTML-escaped (json.Marshal escapes <, >, & by default) so it
// is safe inside a <script> element.
func BuildHTML(template string, ledgerJSON []byte) string {
	return strings.Replace(template, ledgerPlaceholder, string(ledgerJSON), 1)
}

// WriteReportFile writes the self-contained HTML report to path.
func WriteReportFile(path, template string, ledgerJSON []byte) error {
	html := BuildHTML(template, ledgerJSON)
	if err := os.WriteFile(path, []byte(html), 0o644); err != nil {
		return fmt.Errorf("write report %s: %w", path, err)
	}
	return nil
}

// OpenInBrowser opens path (a local file) in the user's default browser.
func OpenInBrowser(path string) error {
	name, args := browserCommand(path)
	return runOpener(name, args...)
}

// RevealInFolder opens the folder containing path in the OS file manager so a
// non-technical user can locate the output files.
func RevealInFolder(path string) error {
	name, args := revealCommand(path)
	return runOpener(name, args...)
}

func runOpener(name string, args ...string) error {
	if name == "" {
		return fmt.Errorf("no opener available on %s", runtime.GOOS)
	}
	if err := exec.Command(name, args...).Start(); err != nil {
		return fmt.Errorf("launch %s: %w", name, err)
	}
	return nil
}

func browserCommand(path string) (string, []string) {
	switch runtime.GOOS {
	case "darwin":
		return "open", []string{path}
	case "windows":
		return "cmd", []string{"/c", "start", "", path}
	default:
		return "xdg-open", []string{path}
	}
}

func revealCommand(path string) (string, []string) {
	switch runtime.GOOS {
	case "darwin":
		return "open", []string{"-R", path}
	case "windows":
		return "explorer", []string{"/select,", filepath.Clean(path)}
	default:
		return "xdg-open", []string{filepath.Dir(path)}
	}
}

// Serve starts a localhost-only HTTP server that serves the report at "/" and
// the raw ledger at "/ledger.json". It prefers the given port and falls back to
// any free port if that one is busy. It returns the chosen URL immediately and
// a wait function that blocks (serving) until ctx is cancelled.
func Serve(ctx context.Context, template string, ledgerJSON []byte, port int) (string, func() error, error) {
	html := []byte(BuildHTML(template, ledgerJSON))

	mux := http.NewServeMux()
	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/" {
			http.NotFound(w, r)
			return
		}
		w.Header().Set("Content-Type", "text/html; charset=utf-8")
		_, _ = w.Write(html)
	})
	mux.HandleFunc("/ledger.json", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json; charset=utf-8")
		_, _ = w.Write(ledgerJSON)
	})

	ln, err := net.Listen("tcp", fmt.Sprintf("127.0.0.1:%d", port))
	if err != nil {
		// Preferred port busy — fall back to any free port.
		ln, err = net.Listen("tcp", "127.0.0.1:0")
		if err != nil {
			return "", nil, fmt.Errorf("listen on localhost: %w", err)
		}
	}
	srv := &http.Server{Handler: mux}
	url := fmt.Sprintf("http://%s/", ln.Addr().String())

	go func() {
		<-ctx.Done()
		_ = srv.Close()
	}()

	wait := func() error {
		if err := srv.Serve(ln); err != nil && err != http.ErrServerClosed {
			return err
		}
		return nil
	}
	return url, wait, nil
}

package main

import (
	"reflect"
	"testing"

	"github.com/sidthesloth92/db-astro-suite/tools/sortronomy/internal/config"
	"github.com/sidthesloth92/db-astro-suite/tools/sortronomy/internal/organize"
)

// TestParseArgsMapsFlagsToOptions covers the flag → options/meta mapping,
// config-seeded defaults, and the bool meta-flags.
func TestParseArgsMapsFlagsToOptions(t *testing.T) {
	seeded := config.Config{Organize: config.OrganizeSettings{
		InputDir:            "/cfg/src",
		OutputDir:           "/cfg/out",
		SessionRolloverHour: 20,
	}}

	tests := []struct {
		name string
		args []string
		cfg  config.Config
		want parsedArgs
	}{
		{
			name: "no args, empty config yields all defaults off",
			args: nil,
			cfg:  config.Config{},
			want: parsedArgs{},
		},
		{
			name: "unset persisted flags fall back to config",
			args: nil,
			cfg:  seeded,
			want: parsedArgs{Options: organize.Options{
				InputDir:            "/cfg/src",
				OutputDir:           "/cfg/out",
				SessionRolloverHour: 20,
			}},
		},
		{
			name: "explicit flags override config defaults",
			args: []string{"--input", "/flag/src", "--output", "/flag/out", "--rollover-hour", "6"},
			cfg:  seeded,
			want: parsedArgs{Options: organize.Options{
				InputDir:            "/flag/src",
				OutputDir:           "/flag/out",
				SessionRolloverHour: 6,
			}},
		},
		{
			name: "grouping and meta flags set their bools",
			args: []string{"--input", "/s", "--group-focal", "--group-session", "--dry-run", "--yes"},
			cfg:  config.Config{},
			want: parsedArgs{
				Options: organize.Options{InputDir: "/s", GroupByFocal: true, GroupSession: true},
				DryRun:  true,
				Yes:     true,
			},
		},
		{
			name: "short flags -y and -v are honored",
			args: []string{"-y", "-v"},
			cfg:  config.Config{},
			want: parsedArgs{Yes: true, Version: true},
		},
		{
			name: "--report sets the report meta-flag",
			args: []string{"--report"},
			cfg:  config.Config{},
			want: parsedArgs{Report: true},
		},
		{
			name: "full filter turns on TagFilter and maps all three fields",
			args: []string{"--filter-type", "Ha", "--filter-name", "SV220", "--filter-desc", "7nm"},
			cfg:  config.Config{},
			want: parsedArgs{Options: organize.Options{
				TagFilter: true,
				Filter:    organize.FilterTag{Type: "Ha", Name: "SV220", Description: "7nm"},
			}},
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			got, err := parseArgs(tc.args, tc.cfg)
			if err != nil {
				t.Fatalf("parseArgs: %v", err)
			}
			if !reflect.DeepEqual(got, tc.want) {
				t.Errorf("parseArgs(%v)\n got: %+v\nwant: %+v", tc.args, got, tc.want)
			}
		})
	}
}

// TestParseArgsInfersTagFilter verifies TagFilter is inferred from the presence
// of any --filter-* value, and stays off when none are supplied — without a
// separate --set-filter gate.
func TestParseArgsInfersTagFilter(t *testing.T) {
	tests := []struct {
		name string
		args []string
		want bool
	}{
		{"no filter flags", nil, false},
		{"only type", []string{"--filter-type", "Ha"}, true},
		{"only name", []string{"--filter-name", "SV220"}, true},
		{"only description", []string{"--filter-desc", "7nm"}, true},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			got, err := parseArgs(tc.args, config.Config{})
			if err != nil {
				t.Fatalf("parseArgs: %v", err)
			}
			if got.Options.TagFilter != tc.want {
				t.Errorf("TagFilter = %v, want %v", got.Options.TagFilter, tc.want)
			}
		})
	}
}

// TestParseArgsHelp verifies -h/--help resolves to a Help request rather than an
// error, so main can print usage.
func TestParseArgsHelp(t *testing.T) {
	for _, arg := range []string{"-h", "--help"} {
		got, err := parseArgs([]string{arg}, config.Config{})
		if err != nil {
			t.Fatalf("parseArgs(%q): unexpected error %v", arg, err)
		}
		if !got.Help {
			t.Errorf("parseArgs(%q): want Help=true", arg)
		}
	}
}

// TestParseArgsUnknownFlagErrors verifies an unrecognized flag surfaces as an
// error so the user gets a clear message instead of silent misbehavior.
func TestParseArgsUnknownFlagErrors(t *testing.T) {
	if _, err := parseArgs([]string{"--nope"}, config.Config{}); err == nil {
		t.Fatal("expected an error for an unknown flag, got nil")
	}
}

// TestParseArgsDoesNotValidatePartialFilter verifies parseArgs itself does not
// reject an incomplete filter — that check belongs to the consumption sites so
// partial flags can still pre-fill the interactive wizard.
func TestParseArgsDoesNotValidatePartialFilter(t *testing.T) {
	got, err := parseArgs([]string{"--filter-type", "Ha"}, config.Config{})
	if err != nil {
		t.Fatalf("parseArgs should not error on a partial filter: %v", err)
	}
	if !got.Options.TagFilter || got.Options.Filter.Name != "" {
		t.Fatalf("unexpected parse result: %+v", got.Options)
	}
}

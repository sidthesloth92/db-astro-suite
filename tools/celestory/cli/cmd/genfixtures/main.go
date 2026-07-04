// Command genfixtures writes a small tree of real FITS files (varied targets,
// filters, cameras, dates, plus a duplicate, a calibration frame, and a garbage
// file) into a target directory. It is a developer aid for exercising the
// celestory CLI end-to-end; it is not shipped in releases.
package main

import (
	"log"
	"os"
	"path/filepath"

	"github.com/astrogo/fitsio"
)

func main() {
	if len(os.Args) < 2 {
		log.Fatal("usage: genfixtures <output-dir>")
	}
	root := os.Args[1]

	// M 31 — two nights, two filters, ZWO 2600MM on a RedCat 51.
	write(filepath.Join(root, "M31", "ha_001.fits"), light("M31", "Ha", 300, "2025-08-01T22:00:00", "ZWO ASI2600MM Pro", "William Optics RedCat 51", 250))
	write(filepath.Join(root, "M31", "ha_002.fits"), light("M31", "Ha", 300, "2025-08-01T22:05:00", "ZWO ASI2600MM Pro", "William Optics RedCat 51", 250))
	write(filepath.Join(root, "M31", "oiii_001.fits"), light("M 31", "OIII", 300, "2025-08-02T22:00:00", "ZWO ASI2600MM Pro", "William Optics RedCat 51", 250))

	// Duplicate of an M31 Ha sub copied into a backup folder.
	write(filepath.Join(root, "backup", "M31", "ha_001.fits"), light("M31", "Ha", 300, "2025-08-01T22:00:00", "ZWO ASI2600MM Pro", "William Optics RedCat 51", 250))

	// NGC 7000 via header synonyms (OBJNAME / EXPOSURE / CAMERA / TELESCOPE).
	write(filepath.Join(root, "NGC7000", "001.fits"), synonymLight("NGC 7000", "Ha", 600, "2025-09-10T21:00:00", "QHY268M", "Esprit 100"))
	write(filepath.Join(root, "NGC7000", "002.fits"), synonymLight("NGC 7000", "SII", 600, "2025-09-11T21:00:00", "QHY268M", "Esprit 100"))

	// M 27 via an EQMOD/ASCOM rig: the mount name lands in TELESCOP (FOCALLEN is
	// still the real telescope), exercising the mount/telescope split — the mount is
	// listed as a Mount and the focal length surfaces on the session.
	write(filepath.Join(root, "M27", "ha_001.fits"), light("M27", "Ha", 300, "2025-07-04T22:00:00", "ZWO ASI2600MM Pro", "EQMod Mount", 530))
	write(filepath.Join(root, "M27", "oiii_001.fits"), light("M27", "OIII", 300, "2025-07-05T22:00:00", "ZWO ASI2600MM Pro", "EQMod Mount", 530))

	// M 42 — one-shot-colour (Bayer, no filter), incl. an undated frame.
	write(filepath.Join(root, "M42", "osc_001.fits"), osc("M42", 120, "2025-12-01T20:00:00", "ZWO ASI2600MC"))
	write(filepath.Join(root, "M42", "osc_undated.fits"), osc("M42", 120, "", "ZWO ASI2600MC"))

	// A calibration frame (must be excluded from integration).
	write(filepath.Join(root, "M31", "dark_001.fits"), dark(300, "ZWO ASI2600MM Pro"))

	// A garbage file (must be skipped without panicking).
	if err := os.WriteFile(filepath.Join(root, "M31", "corrupt.fits"), []byte("not a real fits file"), 0o644); err != nil {
		log.Fatal(err)
	}

	log.Printf("fixtures written under %s", root)
}

func light(target, filter string, exp float64, dateObs, camera, telescope string, focal float64) []fitsio.Card {
	cards := []fitsio.Card{
		{Name: "IMAGETYP", Value: "LIGHT"},
		{Name: "OBJECT", Value: target},
		{Name: "FILTER", Value: filter},
		{Name: "EXPTIME", Value: exp},
		{Name: "INSTRUME", Value: camera},
		{Name: "TELESCOP", Value: telescope},
		{Name: "FOCALLEN", Value: focal},
		{Name: "SWCREATE", Value: "N.I.N.A. 3.0"},
	}
	if dateObs != "" {
		cards = append(cards, fitsio.Card{Name: "DATE-OBS", Value: dateObs})
	}
	return cards
}

func synonymLight(target, filter string, exp float64, dateObs, camera, telescope string) []fitsio.Card {
	return []fitsio.Card{
		{Name: "FRAME", Value: "Light Frame"},
		{Name: "OBJNAME", Value: target},
		{Name: "FILTER", Value: filter},
		{Name: "EXPOSURE", Value: exp},
		{Name: "CAMERA", Value: camera},
		{Name: "TELESCOPE", Value: telescope},
		{Name: "DATE-OBS", Value: dateObs},
	}
}

func osc(target string, exp float64, dateObs, camera string) []fitsio.Card {
	cards := []fitsio.Card{
		{Name: "IMAGETYP", Value: "LIGHT"},
		{Name: "OBJECT", Value: target},
		{Name: "EXPTIME", Value: exp},
		{Name: "INSTRUME", Value: camera},
		{Name: "BAYERPAT", Value: "RGGB"},
	}
	if dateObs != "" {
		cards = append(cards, fitsio.Card{Name: "DATE-OBS", Value: dateObs})
	}
	return cards
}

func dark(exp float64, camera string) []fitsio.Card {
	return []fitsio.Card{
		{Name: "IMAGETYP", Value: "DARK"},
		{Name: "EXPTIME", Value: exp},
		{Name: "INSTRUME", Value: camera},
		{Name: "DATE-OBS", Value: "2025-08-01T18:00:00"},
	}
}

func write(path string, cards []fitsio.Card) {
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		log.Fatal(err)
	}
	f, err := os.Create(path)
	if err != nil {
		log.Fatal(err)
	}
	defer f.Close()
	fits, err := fitsio.Create(f)
	if err != nil {
		log.Fatal(err)
	}
	defer fits.Close()
	img := fitsio.NewImage(8, []int{2, 2})
	defer img.Close()
	if err := img.Header().Append(cards...); err != nil {
		log.Fatal(err)
	}
	if err := img.Write([]int8{0, 0, 0, 0}); err != nil {
		log.Fatal(err)
	}
	if err := fits.Write(img); err != nil {
		log.Fatal(err)
	}
}

package equipment

import "testing"

func TestIsMount(t *testing.T) {
	mounts := []string{
		"EQMod Mount",
		"EQMOD ASCOM",
		"ZWO AM5",
		"ZWO AM5N",
		"ZWO AM3",
		"Sky-Watcher HEQ5 Pro",
		"Sky-Watcher EQ6-R Pro",
		"Sky-Watcher AZ-GTi",
		"Sky-Watcher Wave 150i",
		"iOptron CEM70",
		"iOptron GEM45",
		"iOptron HEM44",
		"iOptron SkyGuider Pro",
		"Celestron CGX",
		"Celestron CGEM II",
		"Celestron AVX",
		"Rainbow Astro RST-135",
		"Star Adventurer GTi",
		"GSServer",
		"OnStep",
		"Pegasus Astro NYX-101",
		"10Micron GM1000 HPS",
		"Paramount MyT",
		"Astro-Physics Mach2GTO",
		"Takahashi EM-200",
	}
	for _, m := range mounts {
		if !isMount(m) {
			t.Errorf("isMount(%q) = false, want true (mount)", m)
		}
	}

	// Real telescopes — especially dual-line brands that also make mounts — must
	// NOT be demoted to mounts.
	telescopes := []string{
		"William Optics RedCat 51",
		"GSO RC8",
		"Sky-Watcher Esprit 100",
		"Takahashi FSQ-106",
		"Askar FRA400",
		"Celestron EdgeHD 800",
		"Samyang 135mm",
		"Explore Scientific ED102",
		"",
		"   ",
	}
	for _, o := range telescopes {
		if isMount(o) {
			t.Errorf("isMount(%q) = true, want false (telescope)", o)
		}
	}
}

func TestMountIDAndDisplay(t *testing.T) {
	if got := MountID("EQMod Mount"); got != "mount-eqmod-mount" {
		t.Errorf("MountID(EQMod Mount) = %q, want mount-eqmod-mount", got)
	}
	if got := MountDisplay("  EQMod Mount  "); got != "EQMod Mount" {
		t.Errorf("MountDisplay = %q, want trimmed 'EQMod Mount'", got)
	}
	// A real telescope yields no mount identity.
	if got := MountID("William Optics RedCat 51"); got != "" {
		t.Errorf("MountID(telescope) = %q, want empty", got)
	}
	if got := MountDisplay("GSO RC8"); got != "" {
		t.Errorf("MountDisplay(telescope) = %q, want empty", got)
	}
}

func TestTelescopeSuppressedForMount(t *testing.T) {
	// When TELESCOP holds a mount, no telescope is synthesised even though a focal
	// length is present — the focal length surfaces on sessions instead.
	if id := TelescopeID("EQMod Mount", 700); id != "" {
		t.Errorf("TelescopeID(mount, focal) = %q, want empty (no telescope for a mount)", id)
	}
	if name := TelescopeDisplay("EQMod Mount", 700); name != "" {
		t.Errorf("TelescopeDisplay(mount, focal) = %q, want empty", name)
	}
	// A genuine scope still becomes a telescope.
	if id := TelescopeID("William Optics RedCat 51", 250); id != "telescope-william-optics-redcat-51" {
		t.Errorf("TelescopeID(scope) = %q, want telescope-william-optics-redcat-51", id)
	}
}

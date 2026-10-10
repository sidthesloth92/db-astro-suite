package equipment

import "testing"

func TestCameraSubtype(t *testing.T) {
	tests := []struct {
		name  string
		raw   string
		isOSC bool
		want  string
	}{
		{"zwo mono by name", "ZWO ASI2600MM Pro", false, "mono"},
		{"zwo colour by name", "ZWO ASI2600MC Pro", false, "colour"},
		{"qhy mono by name", "QHY268M", false, "mono"},
		{"qhy colour by name", "QHY268C", false, "colour"},
		{"colour by bayer signal", "Some OSC Cam", true, "colour"},
		{"dslr canon", "Canon EOS Ra", true, "dslr"},
		{"dslr nikon", "Nikon D810A", false, "dslr"},
		{"player one mono", "Player One Poseidon-M", false, ""},
		{"unknown without signal", "Mystery Cam", false, ""},
		{"empty", "", false, ""},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := CameraSubtype(tt.raw, tt.isOSC); got != tt.want {
				t.Errorf("CameraSubtype(%q, %v) = %q, want %q", tt.raw, tt.isOSC, got, tt.want)
			}
		})
	}
}

func TestMountSubtype(t *testing.T) {
	tests := []struct {
		name string
		in   string
		want string
	}{
		{"zwo am5 harmonic", "ZWO AM5", "harmonic"},
		{"rainbow rst harmonic", "Rainbow Astro RST-135", "harmonic"},
		{"skywatcher eq6 equatorial", "Sky-Watcher EQ6-R Pro", "equatorial"},
		{"celestron cgx equatorial", "Celestron CGX", "equatorial"},
		{"star adventurer tracker", "Star Adventurer GTi", "tracker"},
		{"not a mount", "William Optics RedCat 51", ""},
		{"empty", "", ""},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := MountSubtype(tt.in); got != tt.want {
				t.Errorf("MountSubtype(%q) = %q, want %q", tt.in, got, tt.want)
			}
		})
	}
}

func TestTelescopeSubtype(t *testing.T) {
	tests := []struct {
		name string
		in   string
		want string
	}{
		{"rasa astrograph", "Celestron RASA 8", "astrograph"},
		{"edgehd sct", "Celestron EdgeHD 800", "sct"},
		{"redcat refractor", "William Optics RedCat 51", "refractor"},
		{"esprit refractor", "Sky-Watcher Esprit 120", "refractor"},
		{"newtonian", "Sky-Watcher 200P", "newtonian"},
		{"maksutov", "Skymax Mak 127", "maksutov"},
		{"mount is not a telescope", "ZWO AM5", ""},
		{"ambiguous stays empty", "My Scope", ""},
		{"empty", "", ""},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := TelescopeSubtype(tt.in); got != tt.want {
				t.Errorf("TelescopeSubtype(%q) = %q, want %q", tt.in, got, tt.want)
			}
		})
	}
}

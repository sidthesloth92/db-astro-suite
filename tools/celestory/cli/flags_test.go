package main

import "testing"

func TestParseFlags(t *testing.T) {
	tests := []struct {
		name string
		args []string
		want func(t *testing.T, f cliFlags)
	}{
		{
			name: "defaults",
			args: nil,
			want: func(t *testing.T, f cliFlags) {
				if f.input != "" || f.out != "" || f.noCache || f.showConfig || f.showVersion ||
					f.allDuplicates || f.keepDeleted || f.fresh || f.reset || f.forget != "" ||
					f.assumeYes || f.report || f.profileSet {
					t.Errorf("expected zero-value flags, got %+v", f)
				}
			},
		},
		{
			name: "-report sets the report meta-flag",
			args: []string{"-report"},
			want: func(t *testing.T, f cliFlags) {
				if !f.report {
					t.Error("report = false, want true")
				}
			},
		},
		{
			name: "explicit empty -profile is distinct from absent",
			args: []string{"-profile", ""},
			want: func(t *testing.T, f cliFlags) {
				if !f.profileSet || f.profile != "" {
					t.Errorf("profileSet = %v, profile = %q; want true, \"\"", f.profileSet, f.profile)
				}
			},
		},
		{
			name: "scan flags map through",
			args: []string{"-input", "/data", "-out", "/tmp/o", "-no-cache", "-all-duplicates", "-keep-deleted", "-fresh", "-yes"},
			want: func(t *testing.T, f cliFlags) {
				if f.input != "/data" || f.out != "/tmp/o" || !f.noCache ||
					!f.allDuplicates || !f.keepDeleted || !f.fresh || !f.assumeYes {
					t.Errorf("flags did not map: %+v", f)
				}
			},
		},
		{
			name: "-v prints the version",
			args: []string{"-v"},
			want: func(t *testing.T, f cliFlags) {
				if !f.showVersion {
					t.Error("showVersion = false, want true")
				}
			},
		},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			f := parseFlags(tc.args)
			if f.usage == nil {
				t.Error("usage func must always be set")
			}
			tc.want(t, f)
		})
	}
}

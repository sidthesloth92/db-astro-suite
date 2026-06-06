package main

import _ "embed"

// viewerHTML is the self-contained stats viewer, embedded so the binary can
// write a standalone HTML report (and serve it for --open). It is the same file
// shipped at tools/celestory/viewer/index.html.
//
//go:embed viewer/index.html
var viewerHTML string

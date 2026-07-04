module github.com/sidthesloth92/db-astro-suite/libs/astrofits

go 1.24.2

toolchain go1.24.5

require (
	github.com/astrogo/fitsio v0.3.0
	github.com/sidthesloth92/db-astro-suite/libs/capturetime v0.0.0
)

replace github.com/sidthesloth92/db-astro-suite/libs/capturetime => ../capturetime

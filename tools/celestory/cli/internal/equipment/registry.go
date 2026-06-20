package equipment

import (
	"sort"
	"time"

	"github.com/sidthesloth92/db-astro-suite/tools/celestory/cli/internal/model"
)

// Usage is one light frame's contribution to the equipment registry. The
// aggregate layer maps each frame to a Usage (declared here so equipment does
// not depend on aggregate — avoiding an import cycle).
type Usage struct {
	ObjectID        string
	CameraRaw       string
	Telescope       string
	Focal           float64
	FRatio          float64
	IsOSC           bool // one-shot-colour sensor — drives camera sub-type classification
	ExposureSeconds float64
	Date            time.Time
}

type accumulator struct {
	item   model.EquipmentItem
	objs   map[string]struct{}
	first  time.Time
	last   time.Time
	focal  float64
	fratio float64
}

// BuildRegistry collapses per-frame usages into a deduped list of distinct
// cameras, telescopes, and mounts, each with aggregate stats and the reverse
// index of objects shot with it. Cameras are listed before telescopes before
// mounts; within a kind, items are ordered by total integration descending
// (then display name).
func BuildRegistry(usages []Usage) []model.EquipmentItem {
	accs := map[string]*accumulator{}
	var order []string

	add := func(id, kind, display, subtype string, focal, fratio float64, u Usage) {
		if id == "" {
			return
		}
		a := accs[id]
		if a == nil {
			a = &accumulator{
				item: model.EquipmentItem{ID: id, Kind: kind, Subtype: subtype, DisplayName: display},
				objs: map[string]struct{}{},
			}
			accs[id] = a
			order = append(order, id)
		}
		// Upgrade an unknown sub-type if a later frame classifies it (e.g. a frame
		// that carries the Bayer signal an earlier one lacked).
		if a.item.Subtype == "" && subtype != "" {
			a.item.Subtype = subtype
		}
		a.item.TotalIntegrationSeconds += u.ExposureSeconds
		a.item.LightFrameCount++
		if u.ObjectID != "" {
			a.objs[u.ObjectID] = struct{}{}
		}
		if !u.Date.IsZero() {
			if a.first.IsZero() || u.Date.Before(a.first) {
				a.first = u.Date
			}
			if u.Date.After(a.last) {
				a.last = u.Date
			}
		}
		if kind == "telescope" {
			if a.focal == 0 && focal > 0 {
				a.focal = focal
			}
			if a.fratio == 0 && fratio > 0 {
				a.fratio = fratio
			}
		}
	}

	for _, u := range usages {
		add(CameraID(u.CameraRaw), "camera", CameraDisplay(u.CameraRaw), CameraSubtype(u.CameraRaw, u.IsOSC), 0, 0, u)
		add(TelescopeID(u.Telescope, u.Focal), "telescope", TelescopeDisplay(u.Telescope, u.Focal), TelescopeSubtype(u.Telescope), u.Focal, u.FRatio, u)
		add(MountID(u.Telescope), "mount", MountDisplay(u.Telescope), MountSubtype(u.Telescope), 0, 0, u)
	}

	items := make([]model.EquipmentItem, 0, len(order))
	for _, id := range order {
		a := accs[id]
		a.item.ObjectCount = len(a.objs)
		a.item.ObjectIds = sortedKeys(a.objs)
		a.item.FirstLight = dateString(a.first)
		a.item.LatestSession = dateString(a.last)
		if a.item.Kind == "telescope" {
			if a.focal > 0 {
				f := a.focal
				a.item.FocalLengthMm = &f
			}
			if a.fratio > 0 {
				fr := a.fratio
				a.item.FRatio = &fr
			}
		}
		items = append(items, a.item)
	}

	sort.SliceStable(items, func(i, j int) bool {
		if items[i].Kind != items[j].Kind {
			return kindRank(items[i].Kind) < kindRank(items[j].Kind) // camera, then telescope, then mount
		}
		if items[i].TotalIntegrationSeconds != items[j].TotalIntegrationSeconds {
			return items[i].TotalIntegrationSeconds > items[j].TotalIntegrationSeconds
		}
		return items[i].DisplayName < items[j].DisplayName
	})
	return items
}

// kindRank orders equipment kinds for a stable listing: cameras, then
// telescopes, then mounts. Unknown kinds sort last.
func kindRank(kind string) int {
	switch kind {
	case "camera":
		return 0
	case "telescope":
		return 1
	case "mount":
		return 2
	default:
		return 3
	}
}

func sortedKeys(set map[string]struct{}) []string {
	keys := make([]string, 0, len(set))
	for k := range set {
		keys = append(keys, k)
	}
	sort.Strings(keys)
	return keys
}

func dateString(t time.Time) string {
	if t.IsZero() {
		return ""
	}
	return t.Format("2006-01-02")
}

package model

// EquipmentItem is a distinct, listable piece of gear (a camera, an optic, or a
// mount) with aggregate stats and a reverse index of the objects shot with it.
type EquipmentItem struct {
	ID                      string   `json:"id"`
	Kind                    string   `json:"kind"` // "camera" | "optic" | "mount"
	DisplayName             string   `json:"displayName"`
	FocalLengthMm           *float64 `json:"focalLengthMm"` // optics only; null for cameras
	FRatio                  *float64 `json:"fRatio"`        // optics only; null for cameras
	TotalIntegrationSeconds float64  `json:"totalIntegrationSeconds"`
	LightFrameCount         int      `json:"lightFrameCount"`
	ObjectCount             int      `json:"objectCount"`
	FirstLight              string   `json:"firstLight"`
	LatestSession           string   `json:"latestSession"`
	ObjectIds               []string `json:"objectIds"`
}

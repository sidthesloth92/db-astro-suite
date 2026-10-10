package model

// Session is one night of imaging on a target (the per-target timeline node).
// EquipmentIds reference entries in the story's top-level equipment list, the
// same identifiers a target carries — so the web app resolves gear by id.
// FocalLengthMm / FRatio carry the night's representative telescope spec (the
// values the telescope equipment entry no longer holds for mount-only frames);
// null when unknown.
type Session struct {
	Date               string              `json:"date"`
	IntegrationSeconds float64             `json:"integrationSeconds"`
	LightFrameCount    int                 `json:"lightFrameCount"`
	Filters            []FilterIntegration `json:"filters"`
	EquipmentIds       []string            `json:"equipmentIds"`
	FocalLengthMm      *float64            `json:"focalLengthMm"`
	FRatio             *float64            `json:"fRatio"`
}

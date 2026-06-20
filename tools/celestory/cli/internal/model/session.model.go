package model

// Session is one night of imaging on an object (the per-object timeline node).
// EquipmentIds reference entries in the story's top-level equipment list, the
// same identifiers an object carries — so the web app resolves gear by id.
type Session struct {
	Date               string              `json:"date"`
	IntegrationSeconds float64             `json:"integrationSeconds"`
	LightFrameCount    int                 `json:"lightFrameCount"`
	Filters            []FilterIntegration `json:"filters"`
	EquipmentIds       []string            `json:"equipmentIds"`
}

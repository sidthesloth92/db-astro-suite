package model

// Session is one night of imaging on an object (the per-object timeline node).
type Session struct {
	Date               string              `json:"date"`
	IntegrationSeconds float64             `json:"integrationSeconds"`
	Frames             int                 `json:"frames"`
	Filters            []FilterIntegration `json:"filters"`
	Equipment          SessionEquipment    `json:"equipment"`
}

// SessionEquipment is the fused rig used for a session (kept for per-night detail).
type SessionEquipment struct {
	Camera        string  `json:"camera"`
	Telescope     string  `json:"telescope"`
	FocalLengthMm float64 `json:"focalLengthMm"`
}

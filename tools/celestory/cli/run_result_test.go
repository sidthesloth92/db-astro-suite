package main

import (
	"context"
	"errors"
	"fmt"
	"testing"
)

func TestClassifyRunErr(t *testing.T) {
	tests := []struct {
		name       string
		err        error
		wantCode   int
		wantStatus string
		wantReport bool
	}{
		{name: "nil is ok", err: nil, wantCode: 0, wantStatus: statusOK},
		{name: "cancelled sentinel", err: errCancelled, wantCode: 130, wantStatus: statusCancelled},
		{name: "wrapped cancelled sentinel", err: fmt.Errorf("wizard: %w", errCancelled), wantCode: 130, wantStatus: statusCancelled},
		{name: "context canceled (mid-scan Ctrl-C)", err: context.Canceled, wantCode: 130, wantStatus: statusCancelled},
		{name: "wrapped context canceled", err: fmt.Errorf("scan: %w", context.Canceled), wantCode: 130, wantStatus: statusCancelled},
		{name: "usage error", err: &usageError{msg: "no folder given"}, wantCode: 2, wantStatus: statusUsage},
		{name: "wrapped usage error", err: fmt.Errorf("checking flags: %w", &usageError{msg: "bad"}), wantCode: 2, wantStatus: statusUsage},
		{name: "other errors report", err: errors.New("boom"), wantCode: 1, wantStatus: statusError, wantReport: true},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			got := classifyRunErr(tc.err)
			if got.Code != tc.wantCode {
				t.Errorf("Code = %d, want %d", got.Code, tc.wantCode)
			}
			if got.Status != tc.wantStatus {
				t.Errorf("Status = %q, want %q", got.Status, tc.wantStatus)
			}
			if got.Report != tc.wantReport {
				t.Errorf("Report = %v, want %v", got.Report, tc.wantReport)
			}
		})
	}
}

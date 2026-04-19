# EquiClass - REST API Specification

This document defines the RESTful endpoints for the EquiClass MVP based on Plan.md.

## 1. API Conventions

Base URL:
- /api

Authentication:
- Access token in Authorization header: Bearer <jwt>
- Refresh token returned in response body (or secure HttpOnly cookie if you choose cookie strategy)

Content type:
- Request: application/json
- Response: application/json

Standard success envelope:
```json
{
	"success": true,
	"data": {}
}
```

Standard error envelope:
```json
{
	"success": false,
	"error": {
		"code": "VALIDATION_ERROR",
		"message": "Input payload is invalid",
		"details": []
	}
}
```

Common error codes:
- 400 Bad Request
- 401 Unauthorized
- 403 Forbidden
- 404 Not Found
- 409 Conflict
- 422 Unprocessable Entity
- 500 Internal Server Error

## 2. Auth Routes

### 2.1 Register Professor
- Route URL: /api/auth/register
- HTTP Method: POST
- Auth required: No

Request payload (college-aware):
```json
{
	"email": "a.prof@university.edu",
	"password": "StrongPass#2026",
	"fullName": "Prof A",
	"department": "Computer Science",
	"employeeCode": "CS-204",
	"timezone": "Asia/Kolkata",
	"collegeId": "663f1c2b9a3f3e0012aa0001"
}
```

Notes:
- `collegeId` is preferred.
- `collegeCode` is also accepted for backward compatibility.

Expected response (201):
```json
{
	"success": true,
	"data": {
		"user": {
			"id": "663f1c2b9a3f3e0012aa1001",
			"collegeId": "663f1c2b9a3f3e0012aa0001",
			"email": "a.prof@university.edu",
			"fullName": "Prof A",
			"department": "Computer Science",
			"roles": ["professor"],
			"onboardingCompleted": false,
			"timezone": "UTC"
		},
		"tokens": {
			"accessToken": "<jwt-access>",
			"expiresIn": "15m"
		}
	}
}
```

### 2.2 Login
- Route URL: /api/auth/login
- HTTP Method: POST
- Auth required: No

Request payload (college-aware):
```json
{
	"email": "a.prof@university.edu",
	"password": "StrongPass#2026",
	"collegeId": "663f1c2b9a3f3e0012aa0001"
}
```

Notes:
- `collegeId` is preferred.
- `collegeCode` is also accepted for backward compatibility.

Expected response (200):
```json
{
	"success": true,
	"data": {
		"user": {
			"id": "663f1c2b9a3f3e0012aa1001",
			"collegeId": "663f1c2b9a3f3e0012aa0001",
			"email": "a.prof@university.edu",
			"fullName": "Prof A",
			"department": "Computer Science",
			"roles": ["professor"],
			"onboardingCompleted": true,
			"timezone": "Asia/Kolkata"
		},
		"tokens": {
			"accessToken": "<jwt-access>",
			"expiresIn": "15m"
		}
	}
}
```

### 2.3 Verify JWT (Current User)
- Route URL: /api/auth/me
- HTTP Method: GET
- Auth required: Yes

Request payload:
- None

Expected response (200):
```json
{
	"success": true,
	"data": {
		"user": {
			"id": "663f1c2b9a3f3e0012aa1001",
			"collegeId": "663f1c2b9a3f3e0012aa0001",
			"email": "a.prof@university.edu",
			"fullName": "Prof A",
			"department": "Computer Science",
			"roles": ["professor"],
			"onboardingCompleted": true,
			"timezone": "Asia/Kolkata"
		}
	}
}
```

## 3. College Routes

### 3.1 List Active Colleges (Public)
- Route URL: /api/colleges
- HTTP Method: GET
- Auth required: No

Expected response (200):
```json
{
	"success": true,
	"data": {
		"items": [
			{
				"id": "663f1c2b9a3f3e0012aa0001",
				"name": "National Institute of Technology",
				"code": "NIT-8F4A"
			}
		],
		"count": 1
	}
}
```

### 3.2 Register College/Institution (Public)
- Route URL: /api/colleges/register
- HTTP Method: POST
- Auth required: No

Request payload:
```json
{
	"name": "National Institute of Technology"
}
```

Expected response when created (201):
```json
{
	"success": true,
	"data": {
		"college": {
			"id": "663f1c2b9a3f3e0012aa0001",
			"name": "National Institute of Technology",
			"code": "NIT-8F4A",
			"isActive": true
		},
		"created": true
	}
}
```

Expected response when name already exists (200):
```json
{
	"success": true,
	"data": {
		"college": {
			"id": "663f1c2b9a3f3e0012aa0001",
			"name": "National Institute of Technology",
			"code": "NIT-8F4A",
			"isActive": true
		},
		"created": false
	}
}
```

## 4. User and Timetable Routes

### 4.1 Save or Update My Timetable
- Route URL: /api/timetables/me
- HTTP Method: PUT
- Auth required: Yes

Request payload:
```json
{
	"termId": "2026-Spring",
	"timezone": "Asia/Kolkata",
	"weeklySlots": [
		{
			"dayOfWeek": 1,
			"startTime": "09:00",
			"endTime": "10:00",
			"type": "teaching",
			"courseCode": "CS301",
			"room": "B-204"
		},
		{
			"dayOfWeek": 1,
			"startTime": "10:00",
			"endTime": "11:00",
			"type": "free"
		}
	],
	"exceptions": [
		{
			"date": "2026-04-20",
			"startTime": "09:00",
			"endTime": "10:00",
			"type": "override_free",
			"note": "Conference reschedule"
		}
	]
}
```

Expected response (200):
```json
{
	"success": true,
	"data": {
		"timetable": {
			"id": "663f22a19a3f3e0012aa2010",
			"userId": "663f1c2b9a3f3e0012aa1001",
			"termId": "2026-Spring",
			"timezone": "Asia/Kolkata",
			"weeklySlots": [],
			"exceptions": [],
			"updatedAt": "2026-04-12T12:34:56.000Z"
		},
		"onboardingCompleted": true
	}
}
```

### 4.2 Get My Timetable
- Route URL: /api/timetables/me?termId=2026-Spring
- HTTP Method: GET
- Auth required: Yes

Request payload:
- None

Expected response (200):
```json
{
	"success": true,
	"data": {
		"timetable": {
			"id": "663f22a19a3f3e0012aa2010",
			"userId": "663f1c2b9a3f3e0012aa1001",
			"termId": "2026-Spring",
			"timezone": "Asia/Kolkata",
			"weeklySlots": [],
			"exceptions": []
		}
	}
}
```

### 4.3 Fetch Professor Availability for a Class Slot
- Route URL: /api/timetables/availability
- HTTP Method: POST
- Auth required: Yes

Request payload:
```json
{
	"covererId": "663f1d909a3f3e0012aa1002",
	"termId": "2026-Spring",
	"classEvent": {
		"date": "2026-04-19",
		"dayOfWeek": 0,
		"startTime": "11:00",
		"endTime": "12:00"
	}
}
```

Expected response (200):
```json
{
	"success": true,
	"data": {
		"covererId": "663f1d909a3f3e0012aa1002",
		"termId": "2026-Spring",
		"isFree": true,
		"conflicts": [],
		"checkedAt": "2026-04-12T12:40:00.000Z"
	}
}
```

Expected response when busy (409):
```json
{
	"success": false,
	"error": {
		"code": "COVERER_BUSY",
		"message": "Professor is not available for the requested slot",
		"details": [
			{
				"type": "teaching",
				"startTime": "11:00",
				"endTime": "12:00",
				"courseCode": "CS210"
			}
		]
	}
}
```

### 3.4 Get Basic User List for Request UI
- Route URL: /api/users
- HTTP Method: GET
- Auth required: Yes

Query params:
- department (optional)
- search (optional, name/email)

Request payload:
- None

Expected response (200):
```json
{
	"success": true,
	"data": {
		"items": [
			{
				"id": "663f1d909a3f3e0012aa1002",
				"fullName": "Prof B",
				"department": "Computer Science",
				"email": "b.prof@university.edu"
			}
		],
		"count": 1
	}
}
```

## 4. Ledger Routes

### 4.1 Get My Ledger Summary
- Route URL: /api/ledger/me/summary
- HTTP Method: GET
- Auth required: Yes

Query params:
- termId (optional)

Request payload:
- None

Expected response (200):
```json
{
	"success": true,
	"data": {
		"termId": "2026-Spring",
		"totals": {
			"youOwe": 3,
			"owedToYou": 5,
			"net": 2
		},
		"pairwise": [
			{
				"withUser": {
					"id": "663f1d909a3f3e0012aa1002",
					"fullName": "Prof B"
				},
				"netUnits": 2,
				"direction": "you_owe_them"
			}
		]
	}
}
```

### 4.2 Get My Ledger Transactions
- Route URL: /api/ledger/me/transactions
- HTTP Method: GET
- Auth required: Yes

Query params:
- termId (optional)
- page (optional, default 1)
- limit (optional, default 20)
- fromDate (optional, YYYY-MM-DD)
- toDate (optional, YYYY-MM-DD)

Request payload:
- None

Expected response (200):
```json
{
	"success": true,
	"data": {
		"items": [
			{
				"id": "663f2a9e9a3f3e0012aa3001",
				"requestId": "663f281f9a3f3e0012aa2801",
				"debtorId": "663f1c2b9a3f3e0012aa1001",
				"creditorId": "663f1d909a3f3e0012aa1002",
				"units": 1,
				"unitType": "class",
				"termId": "2026-Spring",
				"classEvent": {
					"date": "2026-04-19",
					"startTime": "11:00",
					"endTime": "12:00",
					"courseCode": "CS301"
				},
				"createdAt": "2026-04-12T14:10:00.000Z"
			}
		],
		"pagination": {
			"page": 1,
			"limit": 20,
			"total": 1
		}
	}
}
```

### 4.3 Get Balance Between Two Professors
- Route URL: /api/ledger/pairwise?withUserId=663f1d909a3f3e0012aa1002&termId=2026-Spring
- HTTP Method: GET
- Auth required: Yes

Request payload:
- None

Expected response (200):
```json
{
	"success": true,
	"data": {
		"me": {
			"id": "663f1c2b9a3f3e0012aa1001",
			"fullName": "Prof A"
		},
		"withUser": {
			"id": "663f1d909a3f3e0012aa1002",
			"fullName": "Prof B"
		},
		"termId": "2026-Spring",
		"netUnits": 2,
		"direction": "you_owe_them"
	}
}
```

## 5. Request Routes

### 5.1 Create Class Coverage Request
- Route URL: /api/requests
- HTTP Method: POST
- Auth required: Yes

Request payload:
```json
{
	"covererId": "663f1d909a3f3e0012aa1002",
	"termId": "2026-Spring",
	"classEvent": {
		"date": "2026-04-19",
		"dayOfWeek": 0,
		"startTime": "11:00",
		"endTime": "12:00",
		"courseCode": "CS301",
		"room": "B-204",
		"department": "Computer Science"
	},
	"reason": "Medical leave",
	"requesterComment": "Need help for one class."
}
```

Expected response (201):
```json
{
	"success": true,
	"data": {
		"request": {
			"id": "663f281f9a3f3e0012aa2801",
			"requesterId": "663f1c2b9a3f3e0012aa1001",
			"covererId": "663f1d909a3f3e0012aa1002",
			"status": "pending",
			"termId": "2026-Spring",
			"classEvent": {
				"date": "2026-04-19",
				"dayOfWeek": 0,
				"startTime": "11:00",
				"endTime": "12:00",
				"courseCode": "CS301",
				"room": "B-204",
				"department": "Computer Science"
			},
			"availabilitySnapshot": {
				"checkedAt": "2026-04-12T14:00:00.000Z",
				"isCovererFree": true,
				"conflictDetails": []
			},
			"createdAt": "2026-04-12T14:00:00.000Z"
		}
	}
}
```

Expected response when coverer unavailable (409):
```json
{
	"success": false,
	"error": {
		"code": "COVERER_NOT_AVAILABLE",
		"message": "Cannot create request because selected professor is busy",
		"details": [
			"Overlaps with teaching slot 11:00-12:00"
		]
	}
}
```

### 5.2 Get Incoming Requests (Requests To Me)
- Route URL: /api/requests/incoming
- HTTP Method: GET
- Auth required: Yes

Query params:
- status (optional: pending, accepted, declined, cancelled, expired)
- termId (optional)
- page (optional)
- limit (optional)

Request payload:
- None

Expected response (200):
```json
{
	"success": true,
	"data": {
		"items": [
			{
				"id": "663f281f9a3f3e0012aa2801",
				"requester": {
					"id": "663f1c2b9a3f3e0012aa1001",
					"fullName": "Prof A"
				},
				"status": "pending",
				"termId": "2026-Spring",
				"classEvent": {
					"date": "2026-04-19",
					"startTime": "11:00",
					"endTime": "12:00",
					"courseCode": "CS301"
				},
				"reason": "Medical leave",
				"createdAt": "2026-04-12T14:00:00.000Z"
			}
		],
		"pagination": {
			"page": 1,
			"limit": 20,
			"total": 1
		}
	}
}
```

### 5.3 Get Outgoing Requests (Requests By Me)
- Route URL: /api/requests/outgoing
- HTTP Method: GET
- Auth required: Yes

Query params:
- status (optional)
- termId (optional)
- page (optional)
- limit (optional)

Request payload:
- None

Expected response (200):
```json
{
	"success": true,
	"data": {
		"items": [
			{
				"id": "663f281f9a3f3e0012aa2801",
				"coverer": {
					"id": "663f1d909a3f3e0012aa1002",
					"fullName": "Prof B"
				},
				"status": "pending",
				"termId": "2026-Spring",
				"classEvent": {
					"date": "2026-04-19",
					"startTime": "11:00",
					"endTime": "12:00",
					"courseCode": "CS301"
				},
				"createdAt": "2026-04-12T14:00:00.000Z"
			}
		],
		"pagination": {
			"page": 1,
			"limit": 20,
			"total": 1
		}
	}
}
```

### 5.4 Accept Coverage Request
- Route URL: /api/requests/:id/accept
- HTTP Method: PATCH
- Auth required: Yes (must be the selected coverer)

Request payload:
```json
{
	"covererComment": "I can take this class."
}
```

Expected response (200):
```json
{
	"success": true,
	"data": {
		"request": {
			"id": "663f281f9a3f3e0012aa2801",
			"status": "accepted",
			"respondedAt": "2026-04-12T14:10:00.000Z"
		},
		"ledgerTransaction": {
			"id": "663f2a9e9a3f3e0012aa3001",
			"requestId": "663f281f9a3f3e0012aa2801",
			"debtorId": "663f1c2b9a3f3e0012aa1001",
			"creditorId": "663f1d909a3f3e0012aa1002",
			"units": 1,
			"unitType": "class",
			"createdAt": "2026-04-12T14:10:00.000Z"
		}
	}
}
```

Expected response when request cannot be accepted (409):
```json
{
	"success": false,
	"error": {
		"code": "REQUEST_NOT_ACCEPTABLE",
		"message": "Request is no longer pending or coverer is now unavailable",
		"details": [
			"Current status: expired"
		]
	}
}
```

### 5.5 Reject Coverage Request
- Route URL: /api/requests/:id/decline
- HTTP Method: PATCH
- Auth required: Yes (must be the selected coverer)

Request payload:
```json
{
	"covererComment": "I already have an exam invigilation at this time."
}
```

Expected response (200):
```json
{
	"success": true,
	"data": {
		"request": {
			"id": "663f281f9a3f3e0012aa2801",
			"status": "declined",
			"respondedAt": "2026-04-12T14:05:00.000Z",
			"covererComment": "I already have an exam invigilation at this time."
		}
	}
}
```

### 5.6 Cancel Coverage Request (Requester)
- Route URL: /api/requests/:id/cancel
- HTTP Method: PATCH
- Auth required: Yes (must be requester, request must be pending)

Request payload:
```json
{
	"requesterComment": "Leave withdrawn, no replacement needed."
}
```

Expected response (200):
```json
{
	"success": true,
	"data": {
		"request": {
			"id": "663f281f9a3f3e0012aa2801",
			"status": "cancelled",
			"updatedAt": "2026-04-12T14:03:00.000Z"
		}
	}
}
```

## 6. Minimal Validation Rules by Endpoint

Auth:
- register: valid institutional email, password complexity, unique email
- login: valid credentials, active account
- me: valid non-expired JWT

Timetable:
- time format HH:mm, startTime < endTime
- no overlapping weekly slots for same day unless explicitly permitted by type logic
- exceptions must be valid date and slot ranges

Ledger:
- pairwise route requires withUserId

Requests:
- requesterId cannot equal covererId
- classEvent date/time must be in future
- create and accept must pass availability check
- accept/decline/cancel only allowed from pending status

## 7. Notes for Frontend Integration

- Store access token in memory and rotate via refresh endpoint.
- Re-fetch ledger summary after successful request acceptance.
- Show deterministic error messages for 409 conflict responses in request flow.
- Use server timestamps from response objects for UI ordering.

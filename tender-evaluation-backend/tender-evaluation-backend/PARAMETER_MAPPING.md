# Parameter Mapping: Old System → New AI System

## Overview
This document maps the parameter changes from the old tender evaluation system to the new AI/ML system for consistency.

## Parameter Changes

### Old Parameters → New Parameters

| Old Parameter | New Parameter | Description | Type |
|---------------|---------------|-------------|------|
| `contractor_name` | `contract_name` | Name of the contractor/company | String |
| `licenseCategory` | `license_category` | License category (A, B, C, C1, C2, etc.) | String |
| `specialization` | *removed* | Specialization field removed | - |
| `bidAmount` | `bid_amount` | Bid amount in currency | Float |
| `projectDuration` | `project_duration` | Project duration in days/months | Integer |
| `warranty` | `warranty_period` | Warranty period in months | Integer |
| `years_experience` | *removed* | Years of experience removed | - |
| `success_rate` | `project_success_rate` | Project success rate percentage | Float |
| `clientRating` | `client_rating` | Client rating (1-5 scale) | Integer |
| `rejectionHistory` | `rejection_history` | Number of past rejections | Integer |
| `safetyCertification` | `safety_certification` | Safety certification status | String |
| `material_source_certainty` | *removed* | Material source certainty removed | - |

## New AI System Parameters

### Required Parameters (All must be present)
```javascript
{
  "contract_name": "ABC Construction",
  "license_category": "C1",
  "project_duration": 90,
  "warranty_period": 24,
  "client_rating": 4,
  "project_success_rate": 95.5,
  "rejection_history": 1,
  "safety_certification": "Yes",
  "bid_amount": 500000
}
```

### Parameter Descriptions

#### `contract_name`
- **Type**: String
- **Description**: Name of the contracting company
- **Example**: "ABC Construction Ltd."

#### `license_category`
- **Type**: String
- **Description**: License category for construction work
- **Values**: "A", "B", "C", "C1", "C2", "C3", "C4", "C5"
- **Example**: "C1"

#### `project_duration`
- **Type**: Integer
- **Description**: Duration of the project in months
- **Range**: 6-60 months
- **Example**: 90

#### `warranty_period`
- **Type**: Integer
- **Description**: Warranty period offered in months
- **Range**: 12-120 months
- **Example**: 24

#### `client_rating`
- **Type**: Integer
- **Description**: Client rating on a scale of 1-5
- **Range**: 1-5
- **Example**: 4

#### `project_success_rate`
- **Type**: Float
- **Description**: Success rate of completed projects (percentage)
- **Range**: 60-100%
- **Example**: 95.5

#### `rejection_history`
- **Type**: Integer
- **Description**: Number of past tender rejections
- **Range**: 0-5
- **Example**: 1

#### `safety_certification`
- **Type**: String
- **Description**: Safety certification status
- **Values**: "Yes", "No"
- **Example**: "Yes"

#### `bid_amount`
- **Type**: Float
- **Description**: Bid amount in currency units
- **Range**: 100,000 - 5,000,000
- **Example**: 500000

## API Endpoints Updated

### 1. Tender Upload (`POST /api/tenders/upload`)
- Now uses new parameter structure
- Returns AI analysis with new parameters
- Falls back to basic extraction if AI fails

### 2. Bid Creation (`POST /api/bids`)
- Updated to use new parameter names
- Validates new required fields
- Stores data with new parameter structure

### 3. AI Analysis (`POST /api/ai/analyze-pdf`)
- Extracts data using new parameter patterns
- Returns analysis with new parameter structure
- Provides prediction using new features

## Database Schema

### Tender Model
```javascript
{
  contract_name: String,
  license_category: String,
  project_duration: Number,
  warranty_period: Number,
  client_rating: Number,
  project_success_rate: Number,
  rejection_history: Number,
  safety_certification: String,
  bid_amount: Number
}
```

### Bid Model
```javascript
{
  tender: ObjectId,
  contractor: ObjectId,
  tenderTitle: String,
  bid_amount: Number,
  project_duration: Number,
  warranty_period: Number,
  notes: String,
  documents: [String],
  project_success_rate: Number,
  client_rating: Number,
  rejection_history: Number,
  safety_certification: String,
  license_category: String,
  contract_name: String
}
```

## Migration Notes

### Frontend Updates Required
1. Update form field names to match new parameters
2. Update API calls to use new parameter structure
3. Update display components to show new field names
4. Update validation rules for new parameters

### Backward Compatibility
- Old API endpoints still work with parameter mapping
- Database migration scripts available
- Fallback mechanisms in place

### Testing
- All new parameters must be present for AI analysis
- Missing parameters will trigger fallback to basic extraction
- Parameter validation ensures data quality

## Error Handling

### Missing Parameters
```javascript
{
  "error": "Missing required parameters",
  "missing": ["contract_name", "license_category"],
  "message": "All parameters must be present for AI analysis"
}
```

### Invalid Parameters
```javascript
{
  "error": "Invalid parameter values",
  "invalid": {
    "client_rating": "Must be between 1-5",
    "project_success_rate": "Must be between 60-100"
  }
}
```

## Performance Impact

### Positive Changes
- Reduced parameter count (9 vs 12)
- More focused feature set
- Better ML model performance
- Cleaner data structure

### Considerations
- Existing data may need migration
- Frontend forms need updates
- API documentation needs updates
- Testing required for all endpoints 
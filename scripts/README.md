# SAT Question Importers

Three simple SAT question importer scripts to populate your database with official SAT questions from College Board API.

## Setup

1. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

2. **Environment variables:**
   Make sure your `.env` file has:
   ```
   SUPABASE_URL=your_supabase_url
   SUPABASE_SECRET_KEY=your_service_key
   ```

## Scripts

### 1. Simple Importer (`populate_sat_questions_simple.py`)
**Best for:** Complete import of all questions
- Imports all domains automatically
- Follows original Python pattern
- Clean, straightforward code

```bash
python populate_sat_questions_simple.py
```

### 2. Modular Importer (`populate_sat_modular.py`)
**Best for:** Command-line control and specific imports
- Import specific domains or events
- Flexible command-line options

```bash
# Import specific domain
python populate_sat_modular.py --domain INI

# Import with specific events
python populate_sat_modular.py --domain H --events 99 100

# Import all reading domains
python populate_sat_modular.py --all-reading

# Import all math domains  
python populate_sat_modular.py --all-math

# Import everything
python populate_sat_modular.py --all

# List available domains
python populate_sat_modular.py --list-domains
```

### 3. Interactive UI (`sat_importer_ui.py`)
**Best for:** User-friendly interface
- Interactive menu system
- Real-time statistics
- Import confirmation

```bash
python sat_importer_ui.py
```

## Domain Codes

**Reading Domains (test=1):**
- `INI`: Information and Ideas
- `CAS`: Craft and Structure  
- `EOI`: Expression of Ideas
- `SEC`: Standard English Conventions

**Math Domains (test=2):**
- `H`: Algebra
- `P`: Advanced Math
- `Q`: Problem Solving and Data Analysis
- `S`: Geometry and Trigonometry

## Event IDs
- `99`: SAT
- `100`: P10  
- `102`: P89

## Features

All scripts include:
- ✅ MathML preprocessing for proper mathematical notation
- ✅ Duplicate question detection via `sat_external_id`
- ✅ Both MCQ and SPR (Student Produced Response) question support
- ✅ Complete skill code mapping to internal skill IDs
- ✅ Domain and subject mapping
- ✅ Basic rate limiting to be respectful to College Board API

## Recommended Usage

1. **Start small:** Use modular importer to test one domain first
2. **Scale up:** Use UI for selective imports
3. **Full import:** Use simple importer for complete database population

## Notes

- Each script automatically handles upserts (no duplicates)
- Import time varies: ~5-10 minutes per domain
- Total import time: ~30-60 minutes for all domains
- Questions are automatically set as `is_active: true`
#!/usr/bin/env python3
"""
Test Script - Import One Question of Each Type

This script fetches just one question of each type (MCQ and SPR/grid-in) 
from the SAT API to test the import functionality before committing to 
importing everything.
"""

import os
import json
import requests
from dotenv import load_dotenv
from supabase import create_client, Client
import logging

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

# College Board API constants
OVERVIEW_API = "https://qbank-api.collegeboard.org/msreportingquestionbank-prod/questionbank/digital/get-questions"
QUESTION_API = "https://qbank-api.collegeboard.org/msreportingquestionbank-prod/questionbank/digital/get-question"

# Complete SAT skill code mapping for testing all domains
SAT_SKILL_MAPPING = {
    # MATH - Algebra (H)
    'H.A.': 'linear-equations-one-var',
    'H.B.': 'linear-functions',
    'H.C.': 'linear-equations-two-var', 
    'H.D.': 'systems-linear-equations',
    'H.E.': 'linear-inequalities',
    
    # MATH - Advanced Math (P)
    'P.A.': 'equivalent-expressions',
    'P.B.': 'nonlinear-equations-systems',
    'P.C.': 'nonlinear-functions',
    
    # MATH - Problem Solving & Data Analysis (Q)
    'Q.A.': 'ratios-rates-proportions',
    'Q.B.': 'percentages',
    'Q.C.': 'one-variable-data',
    'Q.D.': 'two-variable-data',
    'Q.E.': 'probability-conditional',
    'Q.F.': 'inference-statistics',
    'Q.G.': 'statistical-claims',
    
    # MATH - Geometry & Trigonometry (S)
    'S.A.': 'area-volume',
    'S.B.': 'lines-angles-triangles',
    'S.C.': 'right-triangles-trigonometry',
    'S.D.': 'circles',
    
    # ENGLISH - Information & Ideas
    'CID': 'central-ideas-details',
    'INF': 'inferences',  
    'COE': 'command-evidence',
    
    # ENGLISH - Craft & Structure
    'WIC': 'words-in-context',
    'TSP': 'text-structure-purpose',
    'CTC': 'cross-text-connections',
    
    # ENGLISH - Expression of Ideas
    'SYN': 'rhetorical-synthesis',
    'TRA': 'transitions',
    
    # ENGLISH - Standard English Conventions
    'BOU': 'boundaries',
    'FSS': 'form-structure-sense'
}

# Domain test configuration
DOMAIN_TEST_CONFIG = {
    # Math domains
    'H': {'test_id': 2, 'name': 'Algebra', 'target_skills': ['H.A.', 'H.B.']},
    'P': {'test_id': 2, 'name': 'Advanced Math', 'target_skills': ['P.A.', 'P.B.']},
    'Q': {'test_id': 2, 'name': 'Problem Solving & Data Analysis', 'target_skills': ['Q.A.', 'Q.B.']},
    'S': {'test_id': 2, 'name': 'Geometry & Trigonometry', 'target_skills': ['S.A.', 'S.B.']},
    
    # English domains  
    'INI': {'test_id': 1, 'name': 'Information & Ideas', 'target_skills': ['CID', 'INF']},
    'CAS': {'test_id': 1, 'name': 'Craft & Structure', 'target_skills': ['WIC', 'TSP']},
    'EOI': {'test_id': 1, 'name': 'Expression of Ideas', 'target_skills': ['SYN', 'TRA']},
    'SEC': {'test_id': 1, 'name': 'Standard English Conventions', 'target_skills': ['BOU', 'FSS']}
}

def preprocess_mathml_content(text: str) -> str:
    """
    Preprocess MathML content to replace mfenced tags with mo tags
    """
    if not text:
        return text
    
    # Replace opening mfenced tags with mo opening parenthesis
    text = text.replace('<mfenced>', '<mo>(</mo>')
    
    # Replace closing mfenced tags with mo closing parenthesis  
    text = text.replace('</mfenced>', '<mo>)</mo>')
    
    return text

class TestImporter:
    
    def __init__(self):
        load_dotenv()
        
        url: str = os.environ.get("SUPABASE_URL")
        key: str = os.environ.get("SUPABASE_SECRET_KEY")
        
        if not url or not key:
            raise ValueError("Missing Supabase credentials in environment variables")
        
        self.supabase: Client = create_client(url, key)
        
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        })
    
    def fetch_question_overview(self, test_id: int, domain: str, event_id: int = 99):
        """Fetch question overview from SAT API"""
        payload = {
            "asmtEventId": event_id,
            "test": test_id,
            "domain": domain
        }
        
        try:
            logger.info(f"Fetching overview for test {test_id}, domain {domain}")
            response = self.session.post(OVERVIEW_API, json=payload, timeout=30)
            response.raise_for_status()
            
            data = response.json()
            return data if isinstance(data, list) else []
                
        except requests.RequestException as e:
            logger.error(f"Failed to fetch overview for {domain}: {e}")
            return []
    
    def fetch_question_details(self, external_id: str):
        """Fetch detailed question data from SAT API"""
        payload = {"external_id": external_id}
        
        try:
            logger.info(f"Fetching details for question {external_id}")
            response = self.session.post(QUESTION_API, json=payload, timeout=30)
            response.raise_for_status()
            return response.json()
        except requests.RequestException as e:
            logger.error(f"Failed to fetch question details for {external_id}: {e}")
            return None
    
    def find_domain_test_questions(self):
        """Find test questions for each of the 8 SAT domains"""
        domain_questions = {}
        
        for domain_code, domain_info in DOMAIN_TEST_CONFIG.items():
            logger.info(f"Looking for questions in {domain_info['name']} ({domain_code})...")
            
            # Fetch overview for this domain
            overview_questions = self.fetch_question_overview(
                test_id=domain_info['test_id'], 
                domain=domain_code
            )
            
            domain_questions[domain_code] = {
                'info': domain_info,
                'questions': [],
                'found_skills': set()
            }
            
            if not overview_questions:
                logger.warning(f"  No questions found for domain {domain_code}")
                continue
            
            logger.info(f"  Found {len(overview_questions)} questions in domain")
            
            # Look for questions with target skills
            questions_checked = 0
            for overview in overview_questions:
                if questions_checked >= 20:  # Limit to first 20 to speed up testing
                    break
                    
                skill_cd = overview.get('skill_cd')
                external_id = overview.get('external_id')
                
                if not skill_cd or not external_id:
                    continue
                    
                questions_checked += 1
                
                # If this skill is one we're targeting for this domain
                if skill_cd in domain_info['target_skills']:
                    details = self.fetch_question_details(external_id)
                    if details:
                        domain_questions[domain_code]['questions'].append((overview, details))
                        domain_questions[domain_code]['found_skills'].add(skill_cd)
                        logger.info(f"  ✅ Found {details.get('type', 'unknown')} question for skill {skill_cd}")
                        
                        # Stop if we have at least one question for each target skill
                        if len(domain_questions[domain_code]['found_skills']) >= len(domain_info['target_skills']):
                            break
            
            # Report results for this domain
            found_skills = domain_questions[domain_code]['found_skills']
            target_skills = set(domain_info['target_skills'])
            missing_skills = target_skills - found_skills
            
            if missing_skills:
                logger.warning(f"  ⚠️ Missing skills in {domain_code}: {list(missing_skills)}")
            else:
                logger.info(f"  ✅ Found questions for all target skills in {domain_code}")
        
        return domain_questions
    
    def test_import_question(self, question_type: str, overview: dict, question: dict):
        """Test importing a single question"""
        try:
            external_id = overview.get('external_id')
            sat_skill_code = overview.get('skill_cd')
            skill_id = SAT_SKILL_MAPPING.get(sat_skill_code)
            
            # Map domain and subject IDs based on SAT skill code
            domain_id = None
            subject_id = None
            
            if sat_skill_code:
                # Math domains
                if sat_skill_code.startswith('H.'):
                    domain_id = 'algebra'
                    subject_id = 'math'
                elif sat_skill_code.startswith('P.'):
                    domain_id = 'advanced-math'
                    subject_id = 'math'
                elif sat_skill_code.startswith('Q.'):
                    domain_id = 'problem-solving-data-analysis'
                    subject_id = 'math'
                elif sat_skill_code.startswith('S.'):
                    domain_id = 'geometry-trigonometry'
                    subject_id = 'math'
                # English domains
                elif sat_skill_code in ['CID', 'INF', 'COE']:
                    domain_id = 'information-ideas'
                    subject_id = 'english'
                elif sat_skill_code in ['WIC', 'TSP', 'CTC']:
                    domain_id = 'craft-structure'
                    subject_id = 'english'
                elif sat_skill_code in ['SYN', 'TRA']:
                    domain_id = 'expression-ideas'
                    subject_id = 'english'
                elif sat_skill_code in ['BOU', 'FSS']:
                    domain_id = 'standard-english-conventions'
                    subject_id = 'english'
            
            logger.info(f"Testing import of {question_type}: {external_id}")
            logger.info(f"  Skill: {sat_skill_code} → {skill_id}")
            logger.info(f"  Domain: {domain_id}, Subject: {subject_id}")
            logger.info(f"  Type: {question.get('type')}")
            
            if question["type"] == "mcq":
                # Process MCQ answer options
                answer_options = question.get("answerOptions", [])
                processed_answer_options = []
                
                for option in answer_options:
                    if isinstance(option, dict) and 'id' in option:
                        # Preprocess answer option content for MathML
                        option_content = str(option.get('content', ''))
                        processed_answer_options.append({
                            'id': str(option['id']),
                            'content': preprocess_mathml_content(option_content),
                            'is_correct': option.get('is_correct', False)
                        })
                
                logger.info(f"  Answer options: {len(processed_answer_options)} choices")
                
                # Extract correct answers
                correct_answers = question.get('keys', [])
                if isinstance(correct_answers, str):
                    correct_answers = [correct_answers]
                
                logger.info(f"  Correct answers: {correct_answers}")
                
                # Preprocess question text and stimulus for MathML
                question_text = preprocess_mathml_content(question.get("stem", ""))
                stimulus = preprocess_mathml_content(question.get("stimulus")) if question.get("stimulus") else None
                
                # Test upsert
                response = (
                    self.supabase.table("questions")
                    .upsert({
                        "origin": "sat_official",
                        "sat_external_id": external_id,
                        "question_text": question_text,
                        "stimulus": stimulus,
                        "question_type": question["type"],
                        "skill_id": skill_id,
                        "domain_id": domain_id,
                        "subject_id": subject_id,
                        "sat_program": overview.get("program", "SAT"),
                        "difficulty_band": overview.get("score_band_range_cd", 3),
                        "difficulty_letter": overview.get("difficulty"),
                        "answer_options": processed_answer_options,
                        "correct_answers": correct_answers,
                        "explanation": question.get("rationale"),
                        "is_active": True
                    }, on_conflict="sat_external_id", ignore_duplicates=True)
                    .execute()
                )
                
            elif question["type"] == "spr":
                # Process SPR question
                correct_answers = question.get('keys', [])
                if isinstance(correct_answers, str):
                    correct_answers = [correct_answers]
                
                logger.info(f"  Student-produced response")
                logger.info(f"  Correct answers: {correct_answers}")
                
                # Preprocess question text and stimulus for MathML
                question_text = preprocess_mathml_content(question.get("stem", ""))
                stimulus = preprocess_mathml_content(question.get("stimulus")) if question.get("stimulus") else None
                
                # Test upsert
                response = (
                    self.supabase.table("questions")
                    .upsert({
                        "origin": "sat_official",
                        "sat_external_id": external_id,
                        "question_text": question_text,
                        "stimulus": stimulus,
                        "question_type": "spr",
                        "skill_id": skill_id,
                        "domain_id": domain_id,
                        "subject_id": subject_id,
                        "sat_program": overview.get("program", "SAT"),
                        "difficulty_band": overview.get("score_band_range_cd", 3),
                        "difficulty_letter": overview.get("difficulty"),
                        "answer_options": None,  # No options for SPR
                        "correct_answers": correct_answers,
                        "explanation": question.get("rationale"),
                        "is_active": True
                    }, on_conflict="sat_external_id", ignore_duplicates=True)
                    .execute()
                )
            
            if response.data:
                logger.info(f"  ✅ Successfully imported {question_type}")
                return True
            else:
                logger.warning(f"  ⚠️ Question {external_id} may have been a duplicate")
                return True
                
        except Exception as e:
            logger.error(f"  ❌ Error importing {question_type}: {e}")
            return False
    
    def run_test(self):
        """Run comprehensive test import for all 8 SAT domains"""
        logger.info("=" * 80)
        logger.info("SAT QUESTION IMPORT TEST - ALL 8 DOMAINS")
        logger.info("=" * 80)
        
        # Find test questions for each domain
        domain_questions = self.find_domain_test_questions()
        
        # Test import for each domain
        results = {}
        total_imported = 0
        
        for domain_code, domain_data in domain_questions.items():
            domain_name = domain_data['info']['name']
            questions = domain_data['questions']
            
            logger.info(f"\n{'='*50}")
            logger.info(f"TESTING DOMAIN: {domain_name} ({domain_code})")
            logger.info(f"{'='*50}")
            
            if not questions:
                logger.warning(f"❌ No test questions found for {domain_name}")
                results[domain_code] = {'success': False, 'imported': 0, 'total': 0}
                continue
            
            domain_success = 0
            domain_total = len(questions)
            
            for i, (overview, details) in enumerate(questions, 1):
                skill_cd = overview.get('skill_cd')
                question_type = details.get('type', 'unknown')
                external_id = overview.get('external_id')
                
                logger.info(f"\n[{i}/{domain_total}] Testing {domain_name} - {skill_cd} ({question_type})")
                
                test_name = f"{domain_name} - {skill_cd}"
                success = self.test_import_question(test_name, overview, details)
                
                if success:
                    domain_success += 1
                    total_imported += 1
            
            results[domain_code] = {
                'success': domain_success == domain_total,
                'imported': domain_success,
                'total': domain_total,
                'name': domain_name
            }
            
            # Domain summary
            if domain_success == domain_total:
                logger.info(f"✅ {domain_name}: ALL {domain_total} questions imported successfully")
            else:
                logger.warning(f"⚠️ {domain_name}: {domain_success}/{domain_total} questions imported")
        
        # Overall summary
        logger.info("\n" + "=" * 80)
        logger.info("COMPREHENSIVE TEST RESULTS SUMMARY")
        logger.info("=" * 80)
        
        logger.info(f"\n{'DOMAIN':<25} {'RESULT':<15} {'IMPORTED':<10} {'SKILLS TESTED'}")
        logger.info("-" * 80)
        
        successful_domains = 0
        total_domains = len(results)
        
        for domain_code, result in results.items():
            domain_name = result['name']
            status = "✅ SUCCESS" if result['success'] else "❌ FAILED"
            imported_count = f"{result['imported']}/{result['total']}"
            
            # Show which skills were tested
            domain_data = domain_questions[domain_code]
            skills_tested = ', '.join(sorted(domain_data['found_skills']))
            
            logger.info(f"{domain_name:<25} {status:<15} {imported_count:<10} {skills_tested}")
            
            if result['success']:
                successful_domains += 1
        
        # Final statistics
        logger.info("-" * 80)
        logger.info(f"DOMAINS PASSED: {successful_domains}/{total_domains}")
        logger.info(f"QUESTIONS IMPORTED: {total_imported}")
        logger.info(f"SKILLS TESTED: {len([skill for domain in domain_questions.values() for skill in domain['found_skills']])}")
        
        if successful_domains == total_domains:
            logger.info("\n🎉 ALL DOMAIN TESTS PASSED! Ready for full import.")
            logger.info("✅ Run: python populate_sat_questions_final.py")
        else:
            logger.warning(f"\n⚠️ {total_domains - successful_domains} domain(s) failed. Check the logs above.")
            logger.info("🔧 Fix issues before running full import.")
        
        return successful_domains == total_domains

def main():
    """Main execution function"""
    try:
        tester = TestImporter()
        tester.run_test()
    except Exception as e:
        logger.error(f"Fatal error during test: {e}")
        raise

if __name__ == "__main__":
    main()
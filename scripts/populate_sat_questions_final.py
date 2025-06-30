#!/usr/bin/env python3
"""
SAT Question Database Population Script - Final Version
Using direct Supabase upsert pattern matching user's existing code style
"""

import os
import json
import time
import requests
from tqdm import tqdm
from dotenv import load_dotenv
from supabase import create_client, Client
import logging
from typing import Dict, List, Optional

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('sat_import.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

# College Board API constants
OVERVIEW_API = "https://qbank-api.collegeboard.org/msreportingquestionbank-prod/questionbank/digital/get-questions"
QUESTION_API = "https://qbank-api.collegeboard.org/msreportingquestionbank-prod/questionbank/digital/get-question"

# Assessment event IDs to fetch
ASMT_EVENT_IDS = [99, 100, 102, 103, 104, 105]

# Complete SAT skill code mapping
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

# Test configuration
TEST_CONFIG = {
    1: {
        "name": "Reading and Writing", 
        "domains": ["INI", "CAS", "EOI", "SEC"]
    },
    2: {
        "name": "Math", 
        "domains": ["H", "P", "Q", "S"]
    }
}

class SATQuestionImporter:
    
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
        
        self.imported_count = 0
        self.skipped_count = 0
        self.failed_count = 0
        self.duplicate_count = 0
    
    def fetch_question_overview(self, test_id: int, domain: str, event_id: int) -> List[Dict]:
        """Fetch question overview from SAT API"""
        payload = {
            "asmtEventId": event_id,
            "test": test_id,
            "domain": domain
        }
        
        try:
            response = self.session.post(OVERVIEW_API, json=payload, timeout=30)
            response.raise_for_status()
            
            data = response.json()
            return data if isinstance(data, list) else []
                
        except requests.RequestException as e:
            logger.error(f"Failed to fetch overview for {domain}-{event_id}: {e}")
            return []
    
    def fetch_question_details(self, external_id: str) -> Optional[Dict]:
        """Fetch detailed question data from SAT API"""
        payload = {"external_id": external_id}
        
        try:
            response = self.session.post(QUESTION_API, json=payload, timeout=30)
            response.raise_for_status()
            return response.json()
        except requests.RequestException as e:
            logger.error(f"Failed to fetch question details for {external_id}: {e}")
            return None
    
    def add_question(self, overview: dict, question: dict):
        """Add question using upsert pattern matching user's existing code style"""
        try:
            # Extract external_id
            external_id = overview.get('external_id') or overview.get('externalid')
            if not external_id:
                logger.warning("Question missing external_id, skipping")
                self.skipped_count += 1
                return
            
            # Map SAT skill code to internal skill ID
            sat_skill_code = overview.get('skill_cd')
            skill_id = SAT_SKILL_MAPPING.get(sat_skill_code) if sat_skill_code else None
            
            if not skill_id and sat_skill_code:
                logger.warning(f"Unknown SAT skill code: {sat_skill_code}, skipping question {external_id}")
                self.skipped_count += 1
                return
            
            # Process answer options based on question type
            if question["type"] == "mcq":
                # Extract individual answer options for MCQ
                answer_options = question.get("answerOptions", [])
                processed_answer_options = []
                
                for option in answer_options:
                    if isinstance(option, dict) and 'id' in option:
                        processed_answer_options.append({
                            'id': str(option['id']),
                            'content': str(option.get('content', option.get('text', ''))),
                            'is_correct': option.get('is_correct', False)
                        })
                
                # Extract correct answers
                correct_answers = question.get('keys', question.get('correct_answers', []))
                if isinstance(correct_answers, str):
                    correct_answers = [correct_answers]
                
                # Upsert MCQ question
                response = (
                    self.supabase.table("questions")
                    .upsert({
                        "origin": "sat_official",
                        "sat_external_id": external_id,
                        "question_text": question.get("stem", ""),
                        "stimulus": question.get("stimulus"),
                        "question_type": question["type"],
                        "skill_id": skill_id,
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
                
            elif question["type"] in ["spr", "grid_in", "free_response"]:
                # Handle student-produced response questions
                correct_answers = question.get('keys', question.get('correct_answers', []))
                if isinstance(correct_answers, str):
                    correct_answers = [correct_answers]
                
                # Upsert SPR/Grid-in question
                response = (
                    self.supabase.table("questions")
                    .upsert({
                        "origin": "sat_official",
                        "sat_external_id": external_id,
                        "question_text": question.get("stem", ""),
                        "stimulus": question.get("stimulus"),
                        "question_type": "grid_in" if question["type"] == "spr" else question["type"],
                        "skill_id": skill_id,
                        "sat_program": overview.get("program", "SAT"),
                        "difficulty_band": overview.get("score_band_range_cd", 3),
                        "difficulty_letter": overview.get("difficulty"),
                        "answer_options": None,  # No multiple choice options
                        "correct_answers": correct_answers,
                        "explanation": question.get("rationale"),
                        "is_active": True
                    }, on_conflict="sat_external_id", ignore_duplicates=True)
                    .execute()
                )
            else:
                logger.warning(f"Unknown question type: {question['type']}, skipping question {external_id}")
                self.skipped_count += 1
                return
            
            if response.data:
                self.imported_count += 1
                logger.debug(f"Successfully imported question {external_id}")
            else:
                logger.warning(f"Question {external_id} may have been a duplicate")
                self.duplicate_count += 1
                
        except Exception as e:
            logger.error(f"Error importing question {overview.get('external_id', 'unknown')}: {e}")
            self.failed_count += 1
    
    def process_domain_questions(self, test_id: int, domain: str):
        """Process all questions for a specific domain"""
        logger.info(f"Processing domain: {domain}")
        
        for event_id in ASMT_EVENT_IDS:
            logger.info(f"  Fetching questions from event {event_id}")
            
            # Get question overview
            overview_questions = self.fetch_question_overview(test_id, domain, event_id)
            if not overview_questions:
                continue
            
            logger.info(f"  Found {len(overview_questions)} questions to process")
            
            # Process questions with rate limiting
            for overview in tqdm(overview_questions, desc=f"  Processing {domain}-{event_id}"):
                external_id = overview.get('external_id') or overview.get('externalid')
                if not external_id:
                    self.skipped_count += 1
                    continue
                
                # Fetch detailed question data
                question_details = self.fetch_question_details(external_id)
                if not question_details:
                    self.failed_count += 1
                    continue
                
                # Import the question
                self.add_question(overview, question_details)
                
                # Rate limiting to avoid overwhelming the API
                time.sleep(0.1)
    
    def run_import(self):
        """Main import process"""
        logger.info("Starting comprehensive SAT question import")
        logger.info(f"Target skill mappings: {len(SAT_SKILL_MAPPING)} skills")
        
        start_time = time.time()
        
        for test_id, test_info in TEST_CONFIG.items():
            logger.info(f"\n{'='*50}")
            logger.info(f"Processing {test_info['name']} (Test ID: {test_id})")
            logger.info(f"{'='*50}")
            
            for domain in test_info['domains']:
                try:
                    self.process_domain_questions(test_id, domain)
                    logger.info(f"Domain {domain} completed")
                except Exception as e:
                    logger.error(f"Error processing domain {domain}: {e}")
        
        # Final statistics
        elapsed_time = time.time() - start_time
        logger.info(f"\n{'='*50}")
        logger.info("IMPORT COMPLETE")
        logger.info(f"{'='*50}")
        logger.info(f"Total imported: {self.imported_count}")
        logger.info(f"Total duplicates skipped: {self.duplicate_count}")
        logger.info(f"Total failed: {self.failed_count}")
        logger.info(f"Total skipped: {self.skipped_count}")
        logger.info(f"Total processed: {self.imported_count + self.duplicate_count + self.failed_count + self.skipped_count}")
        logger.info(f"Elapsed time: {elapsed_time:.2f} seconds")

def main():
    """Main execution function"""
    try:
        importer = SATQuestionImporter()
        importer.run_import()
    except KeyboardInterrupt:
        logger.info("Import interrupted by user")
    except Exception as e:
        logger.error(f"Fatal error during import: {e}")
        raise

if __name__ == "__main__":
    main()
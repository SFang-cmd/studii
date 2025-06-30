#!/usr/bin/env python3
"""
SAT Question Import UI
A simple interface to run the SAT question import script in smaller chunks
"""

import os
import sys
import subprocess
import tkinter as tk
from tkinter import ttk, messagebox, filedialog
import json
import logging
from dotenv import load_dotenv

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('sat_import_ui.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

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

# Assessment event IDs to fetch
EVENT_IDS = [99, 100, 102]

class SATImportUI:
    def __init__(self, root):
        self.root = root
        self.root.title("SAT Question Import Tool")
        self.root.geometry("800x600")
        self.root.configure(padx=20, pady=20)
        
        # Set up the main frame
        self.main_frame = ttk.Frame(root)
        self.main_frame.pack(fill=tk.BOTH, expand=True)
        
        # Create header
        self.header_label = ttk.Label(
            self.main_frame, 
            text="SAT Question Import Tool", 
            font=("Arial", 18, "bold")
        )
        self.header_label.pack(pady=(0, 20))
        
        # Create description
        self.desc_label = ttk.Label(
            self.main_frame,
            text="Select a test, domain, and event ID to import questions.",
            font=("Arial", 12)
        )
        self.desc_label.pack(pady=(0, 20))
        
        # Create control frame
        self.control_frame = ttk.Frame(self.main_frame)
        self.control_frame.pack(fill=tk.X, pady=10)
        
        # Environment status
        self.env_frame = ttk.Frame(self.main_frame)
        self.env_frame.pack(fill=tk.X, pady=10)
        
        # Check if environment variables are loaded
        supabase_url = os.environ.get("SUPABASE_URL")
        supabase_key = os.environ.get("SUPABASE_SECRET_KEY")
        
        if supabase_url and supabase_key:
            env_status = "✅ Environment variables loaded successfully"
            status_color = "green"
        else:
            env_status = "❌ Environment variables not found. Check your .env file."
            status_color = "red"
        
        self.env_status_label = ttk.Label(
            self.env_frame,
            text=env_status,
            foreground=status_color,
            font=("Arial", 12)
        )
        self.env_status_label.pack(pady=5)
        
        # Test selection
        self.test_frame = ttk.LabelFrame(self.control_frame, text="Test")
        self.test_frame.pack(side=tk.LEFT, padx=10, fill=tk.BOTH)
        
        self.test_var = tk.IntVar(value=1)
        for test_id, test_info in TEST_CONFIG.items():
            ttk.Radiobutton(
                self.test_frame,
                text=f"{test_id}: {test_info['name']}",
                variable=self.test_var,
                value=test_id,
                command=self.update_domains
            ).pack(anchor=tk.W, pady=5)
        
        # Domain selection
        self.domain_frame = ttk.LabelFrame(self.control_frame, text="Domain")
        self.domain_frame.pack(side=tk.LEFT, padx=10, fill=tk.BOTH)
        
        self.domain_var = tk.StringVar()
        self.domain_buttons = []
        self.update_domains()
        
        # Event ID selection
        self.event_frame = ttk.LabelFrame(self.control_frame, text="Event ID")
        self.event_frame.pack(side=tk.LEFT, padx=10, fill=tk.BOTH)
        
        self.event_var = tk.IntVar(value=EVENT_IDS[0])
        for event_id in EVENT_IDS:
            ttk.Radiobutton(
                self.event_frame,
                text=str(event_id),
                variable=self.event_var,
                value=event_id
            ).pack(anchor=tk.W, pady=5)
        
        # Create action buttons
        self.button_frame = ttk.Frame(self.main_frame)
        self.button_frame.pack(fill=tk.X, pady=20)
        
        self.import_button = ttk.Button(
            self.button_frame,
            text="Import Selected",
            command=self.run_import
        )
        self.import_button.pack(side=tk.LEFT, padx=10)
        
        # Status frame
        self.status_frame = ttk.LabelFrame(self.main_frame, text="Status")
        self.status_frame.pack(fill=tk.BOTH, expand=True, pady=10)
        
        # Status text widget
        self.status_text = tk.Text(self.status_frame, wrap=tk.WORD, height=15)
        self.status_text.pack(fill=tk.BOTH, expand=True, padx=5, pady=5)
        
        # Scrollbar for status text
        self.scrollbar = ttk.Scrollbar(self.status_text, command=self.status_text.yview)
        self.scrollbar.pack(side=tk.RIGHT, fill=tk.Y)
        self.status_text.config(yscrollcommand=self.scrollbar.set)
        
        # Progress tracking
        self.progress_var = tk.DoubleVar()
        self.progress = ttk.Progressbar(
            self.main_frame, 
            orient=tk.HORIZONTAL, 
            length=100, 
            mode='indeterminate',
            variable=self.progress_var
        )
        self.progress.pack(fill=tk.X, pady=10)
        
        # Completion tracking
        self.completion_frame = ttk.Frame(self.main_frame)
        self.completion_frame.pack(fill=tk.X, pady=10)
        
        self.completion_label = ttk.Label(
            self.completion_frame,
            text="Completed Tasks:"
        )
        self.completion_label.pack(side=tk.LEFT, padx=5)
        
        # Initialize completion tracking
        self.completed_tasks = {}
        self.update_completion_status()
        
        # Log initial message
        self.log_message("Ready to import SAT questions. Select options and click 'Import Selected'.")
    
    def update_domains(self):
        """Update domain options based on selected test"""
        test_id = self.test_var.get()
        
        # Clear existing domain buttons
        for button in self.domain_buttons:
            button.destroy()
        self.domain_buttons = []
        
        # Create new domain buttons
        for domain in TEST_CONFIG[test_id]["domains"]:
            btn = ttk.Radiobutton(
                self.domain_frame,
                text=domain,
                variable=self.domain_var,
                value=domain
            )
            btn.pack(anchor=tk.W, pady=5)
            self.domain_buttons.append(btn)
        
        # Set default domain
        if TEST_CONFIG[test_id]["domains"]:
            self.domain_var.set(TEST_CONFIG[test_id]["domains"][0])
    
    def log_message(self, message):
        """Add a message to the status text widget"""
        self.status_text.configure(state=tk.NORMAL)
        self.status_text.insert(tk.END, f"{message}\n")
        self.status_text.see(tk.END)
        self.status_text.configure(state=tk.DISABLED)
        self.root.update_idletasks()
    

    
    def run_import(self):
        """Run the SAT question import script with selected parameters"""
        test_id = self.test_var.get()
        domain = self.domain_var.get()
        event_id = self.event_var.get()
        
        if not domain:
            messagebox.showerror("Error", "Please select a domain.")
            return
        
        # Check if environment variables are loaded
        supabase_url = os.environ.get("SUPABASE_URL")
        supabase_key = os.environ.get("SUPABASE_SECRET_KEY")
        
        if not supabase_url or not supabase_key:
            messagebox.showerror("Error", "SUPABASE_URL and SUPABASE_SECRET_KEY environment variables must be set in your .env file")
            return
        
        # Disable the import button during import
        self.import_button.configure(state=tk.DISABLED)
        self.progress.start()
        
        # Log the import start
        self.log_message(f"Starting import for Test {test_id} ({TEST_CONFIG[test_id]['name']}), Domain {domain}, Event {event_id}...")
        
        try:
            # Run the import script with parameters
            cmd = [
                sys.executable,
                "populate_sat_questions_modular.py",
                "--test", str(test_id),
                "--domain", domain,
                "--event", str(event_id)
            ]
            

            
            # Run the process and capture output
            process = subprocess.Popen(
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                bufsize=1,
                universal_newlines=True
            )
            
            # Stream the output to the status text widget
            for line in iter(process.stdout.readline, ''):
                if line:
                    self.log_message(line.strip())
            
            process.stdout.close()
            return_code = process.wait()
            
            if return_code == 0:
                self.log_message(f"Import completed successfully for Test {test_id}, Domain {domain}, Event {event_id}")
                # Mark this combination as completed
                if test_id not in self.completed_tasks:
                    self.completed_tasks[test_id] = {}
                if domain not in self.completed_tasks[test_id]:
                    self.completed_tasks[test_id][domain] = []
                if event_id not in self.completed_tasks[test_id][domain]:
                    self.completed_tasks[test_id][domain].append(event_id)
                self.update_completion_status()
            else:
                self.log_message(f"Import failed with return code {return_code}")
        
        except Exception as e:
            self.log_message(f"Error running import: {e}")
            logger.error(f"Error running import: {e}", exc_info=True)
        
        finally:
            # Re-enable the import button and stop the progress bar
            self.import_button.configure(state=tk.NORMAL)
            self.progress.stop()
    
    def update_completion_status(self):
        """Update the completion status display"""
        status_text = "Completed Tasks: "
        
        if not self.completed_tasks:
            status_text += "None"
        else:
            completed_items = []
            for test_id, domains in self.completed_tasks.items():
                for domain, events in domains.items():
                    for event in events:
                        completed_items.append(f"T{test_id}-{domain}-{event}")
            
            status_text += ", ".join(completed_items)
        
        self.completion_label.configure(text=status_text)
        
        # Save completion status to file
        try:
            with open("sat_import_progress.json", "w") as f:
                json.dump(self.completed_tasks, f)
        except Exception as e:
            logger.error(f"Error saving completion status: {e}")
    
    def load_completion_status(self):
        """Load completion status from file if it exists"""
        try:
            if os.path.exists("sat_import_progress.json"):
                with open("sat_import_progress.json", "r") as f:
                    self.completed_tasks = json.load(f)
                self.update_completion_status()
        except Exception as e:
            logger.error(f"Error loading completion status: {e}")

def main():
    # Try to load environment variables from common locations
    for env_path in [".env", "../.env", "../../.env"]:
        if os.path.exists(env_path):
            print(f"Loading environment variables from {env_path}")
            load_dotenv(env_path)
            break
    
    root = tk.Tk()
    app = SATImportUI(root)
    app.load_completion_status()
    root.mainloop()

if __name__ == "__main__":
    main()

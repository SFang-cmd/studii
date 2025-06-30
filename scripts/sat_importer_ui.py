#!/usr/bin/env python3
"""
Interactive UI for SAT Question Importer
"""

import os
from populate_sat_modular import ModularSATImporter, DOMAIN_CONFIG, ASMT_EVENT_IDS

def clear_screen():
    """Clear the terminal screen"""
    os.system('cls' if os.name == 'nt' else 'clear')

def print_header():
    """Print the application header"""
    print("=" * 60)
    print("           SAT QUESTION IMPORTER")
    print("=" * 60)
    print()

def print_domain_list():
    """Print available domains"""
    print("Available Domains:")
    print()
    print("READING DOMAINS:")
    for code, info in DOMAIN_CONFIG.items():
        if info["test"] == 1:
            print(f"  {code}: {info['name']}")
    
    print("\nMATH DOMAINS:")
    for code, info in DOMAIN_CONFIG.items():
        if info["test"] == 2:
            print(f"  {code}: {info['name']}")
    print()

def get_user_choice():
    """Get user's menu choice"""
    print("IMPORT OPTIONS:")
    print("1. Import single domain")
    print("2. Import all Reading domains")
    print("3. Import all Math domains")
    print("4. Import all domains")
    print("5. View import statistics")
    print("6. Exit")
    print()
    
    while True:
        try:
            choice = int(input("Enter your choice (1-6): "))
            if 1 <= choice <= 6:
                return choice
            else:
                print("Please enter a number between 1 and 6.")
        except ValueError:
            print("Please enter a valid number.")

def get_domain_choice():
    """Get user's domain choice"""
    print_domain_list()
    
    while True:
        domain = input("Enter domain code (e.g., INI, H, P): ").upper().strip()
        if domain in DOMAIN_CONFIG:
            return domain
        else:
            print(f"Invalid domain '{domain}'. Please choose from the list above.")

def get_event_choice():
    """Get user's event ID choice"""
    print(f"Available Event IDs: {ASMT_EVENT_IDS}")
    print("Enter specific event IDs separated by spaces, or press Enter for all:")
    
    event_input = input().strip()
    if not event_input:
        return None
    
    try:
        events = [int(x) for x in event_input.split()]
        valid_events = [e for e in events if e in ASMT_EVENT_IDS]
        if valid_events:
            return valid_events
        else:
            print("No valid event IDs provided. Using all events.")
            return None
    except ValueError:
        print("Invalid input. Using all events.")
        return None

def confirm_import(domain_name, event_ids=None):
    """Confirm import with user"""
    print(f"\nIMPORT CONFIRMATION:")
    print(f"Domain: {domain_name}")
    print(f"Event IDs: {event_ids if event_ids else 'All'}")
    
    while True:
        confirm = input("\nProceed with import? (y/n): ").lower().strip()
        if confirm in ['y', 'yes']:
            return True
        elif confirm in ['n', 'no']:
            return False
        else:
            print("Please enter 'y' or 'n'.")

def main():
    """Main UI loop"""
    importer = ModularSATImporter()
    
    while True:
        clear_screen()
        print_header()
        
        # Show current stats
        if importer.imported > 0 or importer.skipped > 0 or importer.failed > 0:
            print("CURRENT SESSION STATS:")
            print(f"Imported: {importer.imported}")
            print(f"Skipped: {importer.skipped}")
            print(f"Failed: {importer.failed}")
            print(f"Total Processed: {importer.imported + importer.skipped + importer.failed}")
            print()
        
        choice = get_user_choice()
        
        if choice == 1:
            # Import single domain
            clear_screen()
            print_header()
            
            domain_code = get_domain_choice()
            domain_name = DOMAIN_CONFIG[domain_code]["name"]
            
            print(f"\nSelected: {domain_name} ({domain_code})")
            event_ids = get_event_choice()
            
            if confirm_import(domain_name, event_ids):
                print(f"\nStarting import for {domain_name}...")
                print("This may take several minutes. Please wait...")
                importer.import_domain(domain_code, event_ids)
                input("\nPress Enter to continue...")
            
        elif choice == 2:
            # Import all reading
            if confirm_import("All Reading Domains"):
                print("\nStarting import for all Reading domains...")
                print("This may take 15-30 minutes. Please wait...")
                importer.import_all_reading()
                input("\nPress Enter to continue...")
            
        elif choice == 3:
            # Import all math
            if confirm_import("All Math Domains"):
                print("\nStarting import for all Math domains...")
                print("This may take 15-30 minutes. Please wait...")
                importer.import_all_math()
                input("\nPress Enter to continue...")
            
        elif choice == 4:
            # Import all domains
            if confirm_import("All Domains (Reading + Math)"):
                print("\nStarting import for all domains...")
                print("This may take 30-60 minutes. Please wait...")
                importer.import_all()
                input("\nPress Enter to continue...")
            
        elif choice == 5:
            # View statistics
            clear_screen()
            print_header()
            print("CURRENT SESSION STATISTICS:")
            print(f"Imported: {importer.imported}")
            print(f"Skipped: {importer.skipped}")
            print(f"Failed: {importer.failed}")
            print(f"Total Processed: {importer.imported + importer.skipped + importer.failed}")
            print()
            input("Press Enter to continue...")
            
        elif choice == 6:
            # Exit
            print("\nFinal Statistics:")
            importer.print_stats()
            print("\nThank you for using SAT Question Importer!")
            break

if __name__ == "__main__":
    main()
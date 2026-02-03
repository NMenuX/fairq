"""
Sri Lankan NIC (National Identity Card) utilities.

NIC Formats:
- Old format: YYXXXXXXV or YYXXXXXXX (9 digits + V/X) - birth year = 19YY
- New format: YYYYXXXXXXXX (12 digits) - birth year = YYYY
"""
import re
from datetime import date


def validate_nic(nic: str) -> bool:
    """Validate Sri Lankan NIC format."""
    if not nic:
        return False
    
    nic = nic.strip().upper()
    
    # Old format: 9 digits + V or X (e.g., 901234567V)
    old_format = re.match(r'^(\d{9})([VX])$', nic)
    if old_format:
        return True
    
    # New format: 12 digits (e.g., 199012345678)
    new_format = re.match(r'^\d{12}$', nic)
    if new_format:
        return True
    
    return False


def extract_birth_year(nic: str) -> int | None:
    """Extract birth year from NIC."""
    if not nic:
        return None
    
    nic = nic.strip().upper()
    
    # Old format: first 2 digits are year (19YY)
    old_format = re.match(r'^(\d{2})(\d{3})(\d{4})([VX])$', nic)
    if old_format:
        year_suffix = int(old_format.group(1))
        return 1900 + year_suffix
    
    # New format: first 4 digits are year
    new_format = re.match(r'^(\d{4})(\d{3})(\d{5})$', nic)
    if new_format:
        return int(new_format.group(1))
    
    return None


def extract_age_from_nic(nic: str) -> int | None:
    """Calculate current age from NIC."""
    birth_year = extract_birth_year(nic)
    if birth_year is None:
        return None
    
    current_year = date.today().year
    return current_year - birth_year


def extract_gender_from_nic(nic: str) -> str | None:
    """
    Extract gender from NIC.
    In Sri Lankan NIC, the day of year is encoded in digits 3-5.
    - Male: days 001-366
    - Female: days 501-866 (day + 500)
    """
    if not nic:
        return None
    
    nic = nic.strip().upper()
    
    # Old format
    old_format = re.match(r'^(\d{2})(\d{3})(\d{4})([VX])$', nic)
    if old_format:
        day_of_year = int(old_format.group(2))
        return "F" if day_of_year > 500 else "M"
    
    # New format
    new_format = re.match(r'^(\d{4})(\d{3})(\d{5})$', nic)
    if new_format:
        day_of_year = int(new_format.group(2))
        return "F" if day_of_year > 500 else "M"
    
    return None

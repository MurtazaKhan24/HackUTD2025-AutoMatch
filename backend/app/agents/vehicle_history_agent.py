import requests
import logging
from typing import Dict, Any, List

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

def get_vehicle_history(vin: str = None, year: str = None, make: str = None, model: str = None) -> Dict[str, Any]:
    """
    Get vehicle history information including recalls and complaints.
    Uses NHTSA's free API for government data.
    
    Args:
        vin: Vehicle Identification Number (17 characters)
        year: Model year
        make: Vehicle make
        model: Vehicle model
    
    Returns:
        Dictionary with vehicle history data and links
    """
    logger.info(f"Getting vehicle history for VIN: {vin or f'{year} {make} {model}'}")
    
    result = {
        'recalls': [],
        'complaints': [],
        'safety_ratings': None,
        'links': {
            'carfax': None,
            'autocheck': None,
            'nhtsa': None
        },
        'summary': ''
    }
    
    # Generate external links
    if vin:
        result['links']['carfax'] = f"https://www.carfax.com/VehicleHistory/p/Report.cfx?vin={vin}"
        result['links']['autocheck'] = f"https://www.autocheck.com/vehiclehistory/?vin={vin}"
    
    if year and make and model:
        # NHTSA vehicle page
        result['links']['nhtsa'] = f"https://www.nhtsa.gov/vehicle/{year}/{make}/{model}"
    
    try:
        # Get recalls from NHTSA
        if year and make and model:
            recalls_url = f"https://api.nhtsa.gov/recalls/recallsByVehicle"
            params = {
                'make': make,
                'model': model,
                'modelYear': year
            }
            
            response = requests.get(recalls_url, params=params, timeout=10)
            response.raise_for_status()
            recalls_data = response.json()
            
            if recalls_data.get('results'):
                for recall in recalls_data['results'][:5]:  # Limit to 5 most recent
                    result['recalls'].append({
                        'date': recall.get('ReportReceivedDate', 'N/A'),
                        'component': recall.get('Component', 'N/A'),
                        'summary': recall.get('Summary', 'N/A')[:200],
                        'consequence': recall.get('Consequence', 'N/A')[:200],
                        'remedy': recall.get('Remedy', 'N/A')[:200]
                    })
        
        # Get complaints from NHTSA
        if year and make and model:
            complaints_url = f"https://api.nhtsa.gov/complaints/complaintsByVehicle"
            params = {
                'make': make,
                'model': model,
                'modelYear': year
            }
            
            response = requests.get(complaints_url, params=params, timeout=10)
            response.raise_for_status()
            complaints_data = response.json()
            
            if complaints_data.get('results'):
                # Get count by component
                component_counts = {}
                for complaint in complaints_data['results']:
                    comp = complaint.get('components', 'OTHER')
                    component_counts[comp] = component_counts.get(comp, 0) + 1
                
                result['complaints'] = [
                    {'component': comp, 'count': count}
                    for comp, count in sorted(component_counts.items(), key=lambda x: x[1], reverse=True)[:5]
                ]
                
                result['total_complaints'] = len(complaints_data['results'])
        
        # Generate summary
        recall_count = len(result['recalls'])
        complaint_count = result.get('total_complaints', 0)
        
        if recall_count > 0:
            result['summary'] = f"Found {recall_count} active recall(s) for this vehicle. "
        else:
            result['summary'] = "No active recalls found. "
        
        if complaint_count > 0:
            result['summary'] += f"{complaint_count} consumer complaints reported to NHTSA. "
        else:
            result['summary'] += "No complaints reported. "
        
        result['summary'] += "Get a full vehicle history report for complete information."
        
    except Exception as e:
        logger.error(f"Failed to get vehicle history: {e}")
        result['summary'] = "Unable to fetch government data. Get a full vehicle history report for complete information."
    
    return result


def decode_vin(vin: str) -> Dict[str, Any]:
    """
    Decode a VIN to get basic vehicle information.
    Uses NHTSA's free VIN decoder API.
    
    Args:
        vin: Vehicle Identification Number (17 characters)
    
    Returns:
        Dictionary with decoded VIN data
    """
    logger.info(f"Decoding VIN: {vin}")
    
    if not vin or len(vin) != 17:
        return {'error': 'Invalid VIN format. VIN must be 17 characters.'}
    
    try:
        url = f"https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVin/{vin}?format=json"
        response = requests.get(url, timeout=10)
        response.raise_for_status()
        data = response.json()
        
        if data.get('Results'):
            # Extract relevant fields
            result = {}
            for item in data['Results']:
                var_name = item.get('Variable')
                value = item.get('Value')
                
                if value and value != 'Not Applicable':
                    if var_name in ['Make', 'Model', 'Model Year', 'Vehicle Type', 
                                   'Body Class', 'Engine Configuration', 'Engine Number of Cylinders',
                                   'Fuel Type - Primary', 'Transmission Style', 'Drive Type']:
                        result[var_name] = value
            
            return result
        
        return {'error': 'Could not decode VIN'}
        
    except Exception as e:
        logger.error(f"VIN decode failed: {e}")
        return {'error': str(e)}

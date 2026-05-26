const axios = require('axios');

async function test() {
  console.log('Sending unified stitching query comparing all geocoding services to http://localhost:4000/ ...\n');
  
  const query = `
    query CompareGeocoding {
      # 1. Forward Geocoding (Nominatim)
      byQuery: geocode(q: "Beverly Hills") {
        latitude
        longitude
        name
        displayName
        city
        countryName
        principalSubdivision
        postcode
      }
      
      # 2. IP Geocoding (IP-API)
      byIP: geocodeIP(ip: "8.8.8.8") {
        ip
        isp
        timezone
        latitude
        longitude
        details {
          city
          countryName
          principalSubdivision
          postcode
        }
      }
      
      # 3. ZIP Geocoding (Zippopotam)
      byZip: geocodeZip(zip: "90210", countryCode: "us") {
        postcode
        country
        places {
          placeName
          latitude
          longitude
          state
          details {
            city
            countryName
            principalSubdivision
            postcode
          }
        }
      }
    }
  `;
  
  try {
    const response = await axios.post('http://localhost:4000/', { query });
    
    console.log('------------------------------------------------------------');
    console.log('GATEWAY UNIFIED COMPARISON RESULT:');
    console.log('------------------------------------------------------------');
    
    if (response.data.errors) {
      console.error('Errors returned:', JSON.stringify(response.data.errors, null, 2));
    } else {
      console.log(JSON.stringify(response.data.data, null, 2));
    }
  } catch (err) {
    console.error('Query execution failed:', err.message);
    if (err.response) {
      console.error('Response details:', JSON.stringify(err.response.data, null, 2));
    }
  }
}

test();

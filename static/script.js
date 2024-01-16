var map;
var wineryService;
var wineryMarkers = [];
var defaultLocation; // Will be set to the user's location

function initMap() {
   map = new google.maps.Map(document.getElementById('map'), {
       center: defaultLocation, // Default location (initially undefined)
       zoom: 10, // Adjust the initial zoom level
   });

   wineryService = new google.maps.places.PlacesService(map);

   // Check if geolocation is available in the user's browser
   if (navigator.geolocation) {
       // Get the user's current location
       navigator.geolocation.getCurrentPosition(function (position) {
           var userLocation = {
               lat: position.coords.latitude,
               lng: position.coords.longitude,
           };
           defaultLocation = userLocation; // Set the defaultLocation to the user's location
           map.setCenter(defaultLocation); // Set the map center to the user's location
           searchForWineries(defaultLocation); // Perform initial search
       }, function () {
            console.log("geolocation issue");
           // Handle errors if geolocation fails
           defaultLocation = { lat: 37.7749, lng: -122.4194 }; // Default location (San Francisco)
           map.setCenter(defaultLocation); // Set the map center to the default location
           searchForWineries(defaultLocation); // Perform initial search
       });
   } else {
    console.log("geolocation issue");
       // Geolocation is not available, use the default location
       defaultLocation = { lat: 37.7749, lng: -122.4194 }; // Default location (San Francisco)
       map.setCenter(defaultLocation); // Set the map center to the default location
       searchForWineries(defaultLocation); // Perform initial search
   }

   // Add an event listener for map dragging (panning)
   map.addListener('dragend', function () {
       logCoordinates();
       searchForWineries();
   });
}

// Rest of the code remains the same as in the previous response


function logCoordinates() {
   var center = map.getCenter();
   console.log('Map Center Coordinates: Lat ' + center.lat() + ', Lng ' + center.lng());
}

function searchForWineries() {
   // Clear existing winery markers
   wineryMarkers.forEach(function (marker) {
       marker.setMap(null);
   });
   wineryMarkers = [];

   // Define search parameters
   var request = {
       bounds: map.getBounds(),
       keyword: 'winery',
   };

   // Perform a Places API search
   wineryService.nearbySearch(request, function (results, status) {
       if (status === google.maps.places.PlacesServiceStatus.OK) {
           results.forEach(function (place) {
               createWineryMarker(place);
           });
       }
       else {
        crossOriginIsolated.log("!!!!!")
       }
   });
}

function createWineryMarker(place) {
   var marker = new google.maps.Marker({
       map: map,
       position: place.geometry.location,
       title: place.name,
   });

   // Create info window for each marker
   var contentString = '<div><h4>' + place.name + '</h4><p>' + place.vicinity + '</p></div>';
   var infowindow = new google.maps.InfoWindow({
       content: contentString,
   });

   marker.addListener('click', function () {
       infowindow.open(map, marker);
   });

   wineryMarkers.push(marker);
}

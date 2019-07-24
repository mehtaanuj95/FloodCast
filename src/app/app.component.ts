import { Component, ElementRef, ViewChild, NgZone, OnInit, OnDestroy } from '@angular/core';
import { CustomLocation } from './data/customlocation.model';
import {Location, Appearance} from '@angular-material-extensions/google-maps-autocomplete';
import PlaceResult = google.maps.places.PlaceResult;
import { MapsAPILoader } from '@agm/core';
import { Subscription } from 'rxjs';
import { CustomLocationService } from './customlocation.service';
import { NerService } from './ner.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit, OnDestroy {
  @ViewChild('googleAutocomplete', { static: false }) input: ElementRef;
  @ViewChild('address_locality', { static: false }) address_locality: ElementRef;
  @ViewChild('address_postcode', { static: false }) address_postcode: ElementRef;
  @ViewChild('address_country', { static: false }) address_country: ElementRef;
  @ViewChild('locationType', { static: false }) locationType: ElementRef;
  @ViewChild('severity', { static: false }) severity: ElementRef;
  title = 'FloodCast';
  chosenType = 'distress';
  lat: number = 37.774546;
  lng: number = -122.433523;
  private map: google.maps.Map = null;
  private heatmap: google.maps.visualization.HeatmapLayer = null;
  place: google.maps.places.PlaceResult = null;
  distressLocations: CustomLocation[]=[];
  supplyLocations: CustomLocation[]=[];
  distressSubscription: Subscription;
  supplySubscription: Subscription;
  nerSubscription: Subscription;
  categorySubscription: Subscription;
  markers: google.maps.Marker[];
  infos: google.maps.InfoWindow[];
  markerVisible: boolean = true;
  googleNameSpace=null;
  
  constructor(
    private mapsApiLoader: MapsAPILoader,
    private ngZone: NgZone,
    private customLocationService: CustomLocationService,
    private nerService: NerService
    ){}
  
    updateForm(place:google.maps.places.PlaceResult){
      this.input.nativeElement.value="";
      this.address_locality.nativeElement.value="";
      this.address_postcode.nativeElement.value="";
      this.address_country.nativeElement.value="";
        if (place.address_components) {
          place.address_components.forEach(addressComponent => {
              var address_type=addressComponent.types[0];
              if(address_type=="street_number"){
                this.input.nativeElement.value=addressComponent.long_name+" "+this.input.nativeElement.value;
              }
              if(address_type=="route"){
                this.input.nativeElement.value=this.input.nativeElement.value+" "+addressComponent.long_name;
              }
              if(address_type=="sublocality_level_1"){
                this.address_locality.nativeElement.value=addressComponent.long_name+" "+this.address_locality.nativeElement.value;
              }
              if(address_type=="locality"){
                this.address_locality.nativeElement.value=this.address_locality.nativeElement.value+" "+addressComponent.long_name;
              }
              if(address_type=="postal_code"){
                this.address_postcode.nativeElement.value=addressComponent.long_name;
              }
              if(address_type=="country"){
                this.address_country.nativeElement.value=addressComponent.long_name;
              }

                
            });
          }
          
    }
    
  getAddress(place: google.maps.places.PlaceResult){
    let address='';
    address = [
      (place.address_components[0] && place.address_components[0].short_name || ''),
      (place.address_components[1] && place.address_components[1].short_name || ''),
      (place.address_components[2] && place.address_components[2].short_name || '')
    ].join(' ');
  return address;
  }
  
  ngOnInit(){
    this.nerSubscription=this.nerService.data.subscribe(response => {
      let addressString='';
      if(response['data']['PERSON']){
        addressString+=', '+response['data']['PERSON'];
      }
      if(response['data']['ORG']){
        addressString+=', '+response['data']['ORG'];
      }
      if(response['data']['FAC']){
        addressString+=', '+response['data']['FAC'];
      }
      if(response['data']['NORP']){
        addressString+=', '+response['data']['NORP'];
      }
      if(response['data']['GPE']){
        addressString+=', '+response['data']['GPE'];
      }
      if(addressString.length!==0){
        if(addressString.charAt(0)==','){
          addressString=addressString.slice(2);
        }
        this.input.nativeElement.value=addressString;
        this.input.nativeElement.focus();
      }
      console.log(addressString);
    });
    this.categorySubscription=this.nerService.category.subscribe(category => {
      if(category=='Supply'){
        this.locationType.nativeElement.value="supply";
      }
      if(category=='Distress'){
        this.locationType.nativeElement.value="distress";
      }
    });
    this.mapsApiLoader.load().then(
      (()=>{
        this.googleNameSpace=google;
        let autocomplete= new google.maps.places.Autocomplete(this.input.nativeElement);
        autocomplete.setFields(['address_components', 'geometry', 'icon', 'name']);
        autocomplete.addListener("place_changed",(()=>{
          this.ngZone.run(
            (()=>{
              let place: google.maps.places.PlaceResult = autocomplete.getPlace();
              if(place.geometry===undefined||place.geometry===null){
                return;
              }
              this.place=place;
              this.updateForm(place);
            }).bind(this)
          );
        }).bind(this))
      }).bind(this)
    );
    this.distressSubscription=this.customLocationService.distressLocationEmitter.subscribe(
      ((locations:CustomLocation[])=>{
        this.distressLocations=locations;
        this.displayCorrectOverlay();
        this.centerMap();
      }).bind(this)
    );
    this.supplySubscription=this.customLocationService.supplyLocationEmitter.subscribe(
      ((locations:CustomLocation[])=>{
        this.supplyLocations=locations;
        this.displayCorrectOverlay();
        this.centerMap();
      }).bind(this)
    );
    this.distressLocations = this.customLocationService.getDistressLocations();
    
    this.supplyLocations = this.customLocationService.getSupplyLocations();

    this.displayCorrectOverlay();
    this.centerMap();

  }

  displayCorrectOverlay(){
    if(this.chosenType==='distress'){
      this.prepareMarkerLayer(this.distressLocations);
      this.prepareHeatMap(this.distressLocations);
    }
    if(this.chosenType==='supply'){
      this.prepareMarkerLayer(this.supplyLocations);
      this.prepareHeatMap(this.supplyLocations);
    }
  }

  onMapLoad(mapInstance: google.maps.Map) {
      this.map = mapInstance;
      this.map.setZoom(13);
      this.displayCorrectOverlay();
      this.centerMap();
  }

  prepareMarkerLayer(locations:CustomLocation[]){
    this.hideMarkers();
    locations.forEach(((location:CustomLocation)=>{
      let latLng=new google.maps.LatLng(location.place.geometry.location.lat(),location.place.geometry.location.lng());
      let marker = new google.maps.Marker({
        position:latLng,
        map:this.map 
      }); 
      let infoText='Address: '+this.getAddress(location.place)+'\nSeverity:'+location.severity+'\nTimestamp:'+location.timeStamp;
      let infowindow = new google.maps.InfoWindow({
        content: infoText,
        maxWidth: 200
      });
      marker.addListener('click',()=>{
        infowindow.open(this.map,marker);
      })
      this.markers.push(marker);
      this.infos.push(infowindow);
    }).bind(this));
    

  }

  prepareHeatMap(locations:CustomLocation[]){
    let coords= [];
    locations.forEach(location=>{
      let coord={
        location: new google.maps.LatLng(location.place.geometry.location.lat(),location.place.geometry.location.lng()) ,
        weight: location.severity
      }
      coords.push(coord);
    });
    if(this.heatmap){
      this.heatmap.setMap(this.map);
      this.heatmap.setData(coords);
      this.heatmap.set("opacity",1);
    }else{
      if(this.googleNameSpace){
        this.heatmap= new google.maps.visualization.HeatmapLayer({
          map: this.map,
          data: coords
        });
        this.heatmap.set("opacity",1);
      }
      
    }
    
  }

  hideMarkers(){
    if(this.markers){
      while(this.markers.length) { this.markers.pop().setMap(null); }
      this.markers.length=0;
    }else{
      this.markers=[];
    }
    if(this.infos){
      while(this.infos.length){ this.infos.pop(); }
      this.infos.length=0;
    }else{
      this.infos=[];
    }
    
  }

  centerMap(){
    let count=0;
    let TotLat=0;
    let TotLng=0;
    if(this.markers){
      for (var i = 0; i < this.markers.length; i++) {
        count++;
        TotLat+=this.markers[i].getPosition().lat();
        TotLng+=this.markers[i].getPosition().lng();
      }
    }
    if(count===0){
      this.lat=0;
      this.lng=0;
    }else{
      this.lat=TotLat/count;
      this.lng=TotLng/count;
    }
    if(this.map){
      this.map.setCenter({lat:this.lat,lng:this.lng});
    }
  }


  onTypeToggle(){
    this.chosenType= this.chosenType=='distress'?'supply':'distress';
    this.displayCorrectOverlay();
    this.centerMap();
  }

  onMarkerToggle(){
    if(this.markerVisible){
      this.hideMarkers();
    }else{
      this.displayCorrectOverlay();
      this.centerMap();
    }
    this.markerVisible=this.markerVisible?false:true;
  }

  onHeatMapToggle(){
    if(this.heatmap){
      this.heatmap.setMap(this.heatmap.getMap() ? null : this.map);
    }
    
  }

  changeRadius() {
    if(this.heatmap){
      this.heatmap.set('radius', this.heatmap.get('radius') ? null : 20);
    }
    
  }

  refreshForm(){
    this.input.nativeElement.value="";
    this.severity.nativeElement.value="";
    this.locationType.nativeElement.value="distress";
    this.address_locality.nativeElement.value="";
    this.address_postcode.nativeElement.value="";
    this.address_country.nativeElement.value="";

  }
  onGeoCode(){
    let addCustomLocation: CustomLocation = new CustomLocation(this.place,
      this.severity.nativeElement.value,
      this.locationType.nativeElement.value,
      Date.now()
      )
      this.refreshForm();
    this.customLocationService.addLocation(addCustomLocation);
  }

  ngOnDestroy(){
    this.distressSubscription.unsubscribe();
    this.supplySubscription.unsubscribe();
  }
}

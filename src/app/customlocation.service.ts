import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import { CustomLocation } from './data/customlocation.model';

@Injectable({providedIn:'root'})
export class CustomLocationService{
    distressLocationEmitter = new Subject<CustomLocation[]>();
    supplyLocationEmitter = new Subject<CustomLocation[]>();
    distressLocations: CustomLocation[] =[];
    supplyLocations: CustomLocation[] =[];

    addLocation(location:CustomLocation ){
        if(location.type==='distress'){
            this.distressLocations.push(location);
            this.distressLocationEmitter.next(this.distressLocations.slice());
        }
        if(location.type==='supply'){
            this.supplyLocations.push(location);
            this.supplyLocationEmitter.next(this.supplyLocations.slice());
        }
    }

    deleteLocation(index: number, type: string){
        if(type==='distress'){
            this.distressLocations.splice(index,1);
        }
        if(type==='supply'){
            this.supplyLocations.splice(index,1);
        }
    }

    getDistressLocations(){
        return this.distressLocations.slice();
    }

    getSupplyLocations(){
        return this.supplyLocations.slice();
    }
}
export class CustomLocation {

    constructor(
        public place: google.maps.places.PlaceResult,
        public severity: number,
        public type: string,
        public timeStamp: number
        ) {}
}
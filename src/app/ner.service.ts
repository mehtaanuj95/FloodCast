import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import {  Subject } from 'rxjs';

interface Data {
    text: string;
}

@Injectable({providedIn:'root'})
export class NerService {
    serverData: Data = {text: ''};
    data = new Subject<JSON>();
    category = new Subject<string>();

    constructor(private httpClient: HttpClient) {}

    getNer(data: string){
        this.serverData.text = data;
        this.httpClient.post<JSON>('http://localhost:5002/ner', this.serverData).subscribe(responseData => {
            this.data.next(responseData);
        }, error => {
            console.log(error.message);
        });
    }
}

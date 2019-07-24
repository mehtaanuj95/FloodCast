import { Component, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { NerService } from '../ner.service';

const {webkitSpeechRecognition} : IWindow = <IWindow>window;

@Component({
  selector: 'app-speech',
  templateUrl: './speech.component.html',
  styleUrls: ['./speech.component.css']
})
export class SpeechComponent implements AfterViewInit {

  @ViewChild('start_button', { static: false }) startbutton: ElementRef;
  @ViewChild('start_img', { static: false }) startImg: ElementRef;
  @ViewChild('final_span', { static: false }) finalSpan: ElementRef;
  @ViewChild('interim_span', { static: false }) interimSpan: ElementRef;
  final_transcript = '';
  recognizing = false;
  ignore_onend = false;
  two_line = /\n\n/g;
  one_line = /\n/g;
  first_char = /\S/;
  all_first_char = /[a-zA-Z]+/g;
  recognition = null;
  constructor(private nerService: NerService) { }


  ngAfterViewInit() {
    if (!('webkitSpeechRecognition' in window)) {
      this.upgrade();
    } else {
      this.startbutton.nativeElement.style.display = 'inline-block';
      this.recognition = new webkitSpeechRecognition();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.onstart =(() =>{
        this.recognizing = true;
        this.startImg.nativeElement.src = './assets/speech/mic-animate.gif';
      }).bind(this);
      this.recognition.onerror = ((event) => {
        if (event.error == 'no-speech') {
          this.startImg.nativeElement.src = './assets/speech/mic.gif';
          this.ignore_onend = true;
        }
        if (event.error == 'audio-capture') {
          this.startImg.nativeElement.src = './assets/speech/mic.gif';
          this.ignore_onend = true;
        }
        if (event.error == 'not-allowed') {
          this.ignore_onend = true;
        }
      }).bind(this);
      this.recognition.onend = (()=> {
        this.recognizing = false;
        if (this.ignore_onend) {
          return;
        }
        this.startImg.nativeElement.src = './assets/speech/mic.gif';
        if (!this.final_transcript) {
          return;
        }
        if (window.getSelection) {
          window.getSelection().removeAllRanges();
          const range = document.createRange();
          range.selectNode(this.finalSpan.nativeElement);
          window.getSelection().addRange(range);
        }
        console.log('text:'+ this.finalSpan.nativeElement.innerHTML);
        this.nerService.getNer(this.finalSpan.nativeElement.innerHTML);
        let ser = this.finalSpan.nativeElement.innerHTML.search(/suppl[a-z]+/i);
        if(ser!==-1){
          this.nerService.category.next('Supply');
        }else{
          this.nerService.category.next('Distress');
        }
      }).bind(this);
      this.recognition.onresult = ((event)=> {
        let interim_transcript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            this.final_transcript += event.results[i][0].transcript;
          } else {
            interim_transcript += event.results[i][0].transcript;
          }
        }
        this.final_transcript = this.capitalize(this.final_transcript);
        this.final_transcript = this.wordCapitalize(this.final_transcript);
        this.finalSpan.nativeElement.innerHTML = this.linebreak(this.final_transcript);
        this.interimSpan.nativeElement.innerHTML = this.linebreak(interim_transcript);
      }).bind(this);
    }
  }


linebreak(s) {
  return s.replace(this.two_line, '<p></p>').replace(this.one_line, '<br>');
}


capitalize(s) {
  return s.replace(this.first_char, function(m) { return m.toUpperCase(); });
}

wordCapitalize(s){
  return s.replace(this.all_first_char, function(m) { return m.charAt(0).toUpperCase()+m.slice(1); });
}


upgrade() {
  this.startbutton.nativeElement.style.visibility = 'hidden';
}

startButton(event){
  if (this.recognizing) {
    this.recognition.stop();
    return;
  }
  this.final_transcript = '';
  this.recognition.lang = 'en-IN';
  this.recognition.start();
  this.ignore_onend = false;
  this.finalSpan.nativeElement.innerHTML = '';
  this.interimSpan.nativeElement.innerHTML = '';
  this.startImg.nativeElement.src = './assets/speech/mic-slash.gif';
}

}

export interface IWindow extends Window {
  webkitSpeechRecognition: any;
}

import { Injectable } from '@angular/core';
import { AngularFirestore } from 'angularfire2/firestore';
import { Observable } from 'rxjs/Observable';


@Injectable()
export class MapFirestoreService {
  items: Observable<any[]>;

  constructor(private db: AngularFirestore) {
    this.items = db.collection('grid').doc('normal').collection('id').valueChanges();
    
    console.log(this.items);
      }


      getList(){
        return this.items;
      }
      

}

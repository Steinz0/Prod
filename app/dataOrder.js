class OrderDB{
    constructor(db) {
        this.db = db
        this.db.loadDatabase();
    };

    insertData(userId, ballCoord, redCoords, blueCoords, score, actualPlayer, team, order) {
        return new Promise((resolve, reject) => {
            this.db.insert({userId, ballCoord, redCoords, blueCoords, score, actualPlayer, team, order}, function(err, result) {
                if (err) {
                    reject(err);
                }else{
                    resolve(result);
                }
            });
        })
    }

    recupData(){
        return new Promise((resolve, reject) => {
            this.db.find({}).exec( function (err, result) {
                if (err){
                    reject(err);
                }
                resolve(result.reverse());
            });
        }) 
    }
}


exports.default = OrderDB;
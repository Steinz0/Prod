class UserDB{
    constructor(db) {
        this.db = db
        this.db.loadDatabase();
    };

    createUser(name, email, password) {
        return new Promise((resolve, reject) => {
            let idMatches = []
            this.db.insert({name, email, password, idMatches}, function(err, result) {
                if (err) {
                    reject(err);
                }else{
                    resolve(result);
                }
            });
        })
    }

    async addMatch(id, idMatch) {
        const user = await this.getUserByid(id)
        let listMatches = user[0].idMatches
        listMatches.push(idMatch)

        return new Promise((resolve, reject) => {
            this.db.update({ _id: id}, { $set: {idMatches: listMatches}}, function (err, result) {
                if (err){
                    reject(err)
                } else {
                    resolve(result)
                }
            })
        })
    }

    getUserByEmail(email){
        return new Promise((resolve, reject) => {
            this.db.find({email: email}).exec( function (err, result) {
                if (err){
                    reject(err);
                }
                resolve(result);
            });
        }) 
    }

    getUserByid(id){
        return new Promise((resolve, reject) => {
            this.db.find({_id: id}).exec( function (err, result) {
                if (err){
                    reject(err);
                }
                resolve(result);
            });
        }) 
    }

    getUsers(){
        return new Promise((resolve, reject) => {
            this.db.find({}).exec( function (err, result) {
                if (err){
                    reject(err);
                }
                resolve(result);
            });
        }) 
    }

    async deleteGame(userID, fileID){
        const user = await this.getUserByid(userID)
        let listMatches = user[0].idMatches
        let newList = listMatches.filter(e => e !== fileID)

        return new Promise((resolve, reject) => {
            this.db.update({ _id: userID}, { $set: {idMatches: newList}}, function (err, result) {
                if (err){
                    reject(err)
                } else {
                    resolve(result)
                }
            })
        })
    }

    getAdmin(){
        return new Promise((resolve, reject) => {
            this.db.find({email: 'admin@admin'}).exec( function (err, result) {
                if (err){
                    reject(err);
                }
                resolve(result);
            });
        }) 
    }
}


exports.default = UserDB;
const mongoose = require('mongoose');
module.exports = () => {
    const connectionParams = {
        useNewUrlParser: true,
        useUnifiedTopology: true
    }
    mongoose.connect(process.env.DB, connectionParams).then(() => {
        console.log('Connected to database ');
    }).catch((err) => {
        console.error(`Error connecting to the database. \n${err}`);
    })
}
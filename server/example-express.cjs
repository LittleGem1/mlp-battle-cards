// Example only: do NOT replace your own server entrypoint.
const express=require('express');
const path=require('node:path');
const app=express();
app.use(express.static(path.resolve(__dirname,'../public')));
app.listen(3000,()=>console.log('Demo http://localhost:3000/specials-test.html'));

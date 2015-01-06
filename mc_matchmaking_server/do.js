'use strict';
var ObjApi = require('digitalocean').Api;
var api = new ObjApi('a8738f840f3660ea8a7e71549816202e', '2f62c296280433869d9e9482785c5607');
var token = '87cfccb080cc721b3cd820a9d628d798a9176bb6809568990c8d91459dca0a57';
var program = require('commander');

program
  .version('0.0.1')
  .option('-i, --images', 'See all Digitalocean images')
  .option('-d, --destroy', 'Destory all')
  .parse(process.argv);

if(program.images){
    api.images.my(function(image){
        console.log(image);
    });
}else if(program.destroy){
    api.droplets.all(function(droplets){
        droplets.forEach(function(drop){
            drop.destroy(function(res){
                console.log('Destroyed: ' + drop.name);
            });
        });
    });
}

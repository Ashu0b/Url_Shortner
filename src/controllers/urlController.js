const UrlModel=require("../models/urlModel")
const validator=require("../validator/validator")
const shortid=require("shortid");
const validUrl=require("valid-url")
const redis=require("redis")
//import redis

const { promisify } = require("util");

//Connect to redis
const redisClient = redis.createClient(
    19296,
  "redis-19296.c15.us-east-1-4.ec2.cloud.redislabs.com",
  { no_ready_check: true }
);
redisClient.auth("omzcUy7OOD6V5hhkhxFKuae3Gd7942CN", function (err) {
  if (err) throw err;
});

redisClient.on("connect", async function () {
  console.log("Connected to Redis..");
});



//1. connect to the server
//2. use the commands :

//Connection setup for redis

const SET_ASYNC = promisify(redisClient.SET).bind(redisClient);
const GET_ASYNC = promisify(redisClient.GET).bind(redisClient);




const shortUrlFun=async (req,res)=>{
    try{
        const data=req.body
        const baseUrl = req.headers.host
        if(!validUrl.isUri(baseUrl)){
            return res.status(401).send("invalid baseurl")
        }
        console.log(baseUrl)
        if(!validator.isRequestBody(data)){
            return res.status(400).send({status:false,message:"please provide data in request body "})
        }
        const {longUrl}=data
        if(!longUrl){
            return res.status(400).send({status:false,message:"please provide long url in body"})
        }

        if(!validUrl.isUri(longUrl.trim())){
            return res.status(400).send({status:false,message:"please valid long url"})
        }
        const urlCode=shortid.generate(longUrl)
        //checking whether longurl already exists or not
        const uniqueShortUrl=await UrlModel.findOne({longUrl:longUrl}).select({createdAt:0,updatedAt:0,__v:0,_id:0});
        if(uniqueShortUrl){
            return res.status(200).send({status:truef,data:uniqueShortUrl})
        }

        
        const shortUrl=baseUrl+"/"+urlCode.toLowerCase()
        console.log(urlCode)

       
        if(!urlCode){
            return res.status(400).send({status:false,message:"please provide urlcode url "})
        }
     
       
            let obj={longUrl,shortUrl,urlCode}
            let saveData=await UrlModel.create(obj)
            let urlRes=await UrlModel.findOne(saveData).select({longUrl:1,shortUrl:1,urlCode:1,_id:0})

            //caching
            await SET_ASYNC(`${urlCode}`,JSON.stringify(longUrl))
            await SET_ASYNC(`${longUrl}`,JSON.stringify(longUrl))

            return res.status(201).send({status:false,message:"successfully created",data:urlRes})
        



    }catch(err){
        res.status(500).send({status:false,message:err.message})
    }
}

const getShortUrl= async (req,res)=>{
    try{
        let urlCode=req.params.urlCode

        if(!urlCode){
            return res.status(400).send({status:false,message:"please provide urlcode"})
        }
        let shortCode=urlCode.trim().toLowerCase()
        //start caching storage
         let cahcedProfileData = await GET_ASYNC(shortCode)
         let parseLongUrl=JSON.parse(cahcedProfileData)


        if(parseLongUrl){
            return res.status(302).redirect(parse.longUrl)
        }else{

        let urlData=await UrlModel.findOne({urlCode:urlCode}).select({longUrl:1,shortUrl:1,urlCode:1})
        if(!urlData){
            return res.status(404).send({status:false,message:"not found"})
        }
        res.status(302).redirect(urlData.longUrl)
        
    }
    }catch(err){
        res.status(500).send({status:false,message:err.message})
    }
}

module.exports={shortUrlFun,getShortUrl}
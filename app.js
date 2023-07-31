//jshint esversion:6

const express = require('express');
const multer = require('multer');
const AWS = require('aws-sdk');
const bodyParser=require("body-parser");
const ejs = require("ejs");
const fs=require("fs");
const cv = require("opencv4nodejs");
const Jimp = require("jimp");
require('dotenv').config()

AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

const app = express();
app.use(bodyParser.urlencoded({extended:false}));
app.use(express.static("public"));
app.set('view engine', 'ejs');
const upload = multer({ dest: 'uploads/' });

const rekognition = new AWS.Rekognition();

const s3=new AWS.S3();

const bucketName = 'vis-images-sap';

const PORT = process.env.PORT || 3000;

app.listen(PORT,(req,res)=>{
    console.log("Port 3000 Started");
    console.log('OpenCV version:', cv.version, cv.version.major, cv.version.minor);
})

app.get("/",(req,res)=>{
    res.render("index");
})

/*-------------IMAGE PROCESS START----------------------------*/

/*   -------------IMAGE UPLOAD START----------------------------*/

app.post("/upload", upload.single('image') ,(req,res)=>{

    var img=req.file;

    objectKey = 'images/' + img.originalname;
  
    const fileContent = fs.readFileSync(img.path);

    const params = {
        Bucket: bucketName,
        Key: objectKey,
        Body: fileContent
      };

      s3.upload(params,(err,data)=>{
        if(err)
        console.log(err);
        else
        {
            console.log("Image Uploaded Succesfully");
            res.render("imageactions");
        }
      });
});

/*-------------IMAGE UPLOAD END----------------------------*/

/*-------------IMAGE ACTION START----------------------------*/

app.post("/action", (req,res)=>{
    var action=req.body.btn;
    const params={
        Image : {
            S3Object:{
                Bucket: bucketName,
                Name: objectKey
            }
        },
        Attributes : ["ALL"]
    }

    //--------AGE DETECTION------------//

    if(action=="age")
    {
        rekognition.detectFaces(params,(err,data)=>{
            if(err)
            {
                console.log(err);
            }
            else
            {
                console.log("Detect Success");

                res.render("age_mood", {title: "Age Detected", faceDetails: data.FaceDetails, moodview: "hidden", ageview: ""});
            }
        });
    }

    //--------MOOD DETECTION------------//

    else if(action=="mood")
    {
        rekognition.detectFaces(params,(err,data)=>{
            if(err)
            {
                console.log(err);
            }
            else
            {
              res.render("age_mood", {title: "Age Detected", faceDetails: data.FaceDetails, moodview: "", ageview: "hidden"});
            }
        })
    }

    //--------DRESS DETECTION------------//

    else if(action=="formal")
    {
        const formalparams={
            Image : {
                S3Object:{
                    Bucket: bucketName,
                    Name: objectKey
                }
            }
        }

        const informalDressLabels = ['casual', 'informal', 'jeans', 't-shirt'];

        rekognition.detectLabels(formalparams,(err,data)=>{
            if(err)
            {
                console.log(err);
            }

            else
            {
              // res.send(data);
                const labels = data.Labels.map(label => label.Name.toLowerCase());

                const informalDressDetected = labels.some(label => informalDressLabels.includes(label));

                if(informalDressDetected)
                res.send("Detected");

                else
                res.send("Not Detected");
            }
        });
    }

    //--------TIREDNESS DETECTION------------//

    else if(action=="sleepy")
    {
        rekognition.detectFaces(params, (err,data)=>{
            if(err)
            {
                console.log(err);
            }
            else
            {
                let facialLandmarks=data.FaceDetails[0].Landmarks;

                const sleepyparams={
                    Bucket: bucketName,
                    Key: objectKey
                }
                
                s3.getObject(sleepyparams,(err,data)=>{
                    if(err)
                    {
                        console.log(err);
                    }
                    else
                    {
                        console.log("----------------------****GOT OBJECT SUCCESS***-------------------");
                        const imageBuffer = data.Body;

                        rekognition.detectFaces(params,(err,data)=>{
                          if(err)
                          {
                              console.log(err);
                          }
                          else
                          {
                              // console.log("Detect Success");
                              if(data.FaceDetails[0].EyesOpen.Value === "False")
                              {
                                res.render("sleepy", {msg: "Eyes are closed, seems to be sleepy "+" Confidence: "+data.FaceDetails[0].EyesOpen.Confidence});
                              }

                              else
                              {
                                Jimp.read(imageBuffer)
                                .then(image =>{
        
                                    const imageWidth = image.bitmap.width;
                                    const imageHeight = image.bitmap.height;
        
                                    let leftEyeLandmarks = facialLandmarks.find(landmark=> landmark.Type==="leftEyeLeft");
                                    const leftEye_X_min=leftEyeLandmarks.X*imageWidth;
        
                                    leftEyeLandmarks = facialLandmarks.find(landmark=> landmark.Type==="leftEyeRight");
                                    const leftEye_X_max=leftEyeLandmarks.X*imageWidth;
        
                                    const leftEye_width=leftEye_X_max-leftEye_X_min;
        
                                    leftEyeLandmarks = facialLandmarks.find(landmark=> landmark.Type==="leftEyeUp");
                                    const leftEye_Y_min=leftEyeLandmarks.Y*imageHeight;
        
                                    leftEyeLandmarks = facialLandmarks.find(landmark=> landmark.Type==="leftEyeDown");
                                    const leftEye_Y_max=leftEyeLandmarks.Y*imageHeight;
        
                                    const leftEye_height=leftEye_Y_max-leftEye_Y_min;
        
                                    const leftEyeImage = image.clone().crop(leftEye_X_min, leftEye_Y_min, leftEye_width, leftEye_height);
        
                                    const rgbValues = [];
        
                                    let r_avg=0;
                                    let g_avg=0;
                                    let b_avg=0;
                                    let pixelCount=0;
        
                                    leftEyeImage.scan(0, 0, leftEyeImage.bitmap.width, leftEyeImage.bitmap.height, (px, py, idx) => {
                                    let red = leftEyeImage.bitmap.data[idx + 0];
                                    let green = leftEyeImage.bitmap.data[idx + 1];
                                    let blue = leftEyeImage.bitmap.data[idx + 2];
                                    
                                    r_avg+=red;
                                    g_avg+=green;
                                    b_avg+=blue;
                                    pixelCount++;
        
                                    });
        
                                    let rightEyeLandmarks = facialLandmarks.find(landmark=> landmark.Type==="rightEyeLeft");
                                    const rightEye_X_min=rightEyeLandmarks.X*imageWidth;
        
                                    rightEyeLandmarks = facialLandmarks.find(landmark=> landmark.Type==="rightEyeRight");
                                    const rightEye_X_max=rightEyeLandmarks.X*imageWidth;
        
                                    const rightEye_width=rightEye_X_max-rightEye_X_min;
        
                                    rightEyeLandmarks = facialLandmarks.find(landmark=> landmark.Type==="rightEyeUp");
                                    const rightEye_Y_min=rightEyeLandmarks.Y*imageHeight;
        
                                    rightEyeLandmarks = facialLandmarks.find(landmark=> landmark.Type==="rightEyeDown");
                                    const rightEye_Y_max=rightEyeLandmarks.Y*imageHeight;
        
                                    const rightEye_height=rightEye_Y_max-rightEye_Y_min;
        
                                    const rightEyeImage = image.clone().crop(rightEye_X_min, rightEye_Y_min, rightEye_width, rightEye_height);
        
                                    rightEyeImage.scan(0, 0, rightEyeImage.bitmap.width, rightEyeImage.bitmap.height, (px, py, idx) => {
                                        let red = rightEyeImage.bitmap.data[idx + 0];
                                        let green = rightEyeImage.bitmap.data[idx + 1];
                                        let blue = rightEyeImage.bitmap.data[idx + 2];
                                        
                                        r_avg+=red;
                                        g_avg+=green;
                                        b_avg+=blue;
                                        pixelCount++;
            
                                        });
        
                                    r_avg=Math.round(r_avg / pixelCount);
                                    g_avg=Math.round(g_avg / pixelCount);
                                    b_avg=Math.round(b_avg / pixelCount);
        
                                    rgbValues.push({ r_avg, g_avg, b_avg });
        
                                    res.render("sleepy", {msg: rgbValues[0]});    
        
                                });
                              }
                          }
                      });
                    }
                });
            }
        });
    }

    //--------STRANGER DETECTION------------//

    else if(action==="stranger")
    {
        // console.log("Recieved Employees");
        res.render("employee");

        app.post("/employee", upload.single('stranger') ,(req,res)=>{
            var img=req.file;

            strangerobjectKey = 'path/to/upload/' + img.originalname;

            const fileContent = fs.readFileSync(img.path);

            const params = {
                Bucket: bucketName,
                Key: strangerobjectKey,
                Body: fileContent
            };

            s3.upload(params,(err,data)=>{
                if(err)
                console.log(err);
                else
                {
                    console.log("Image Uploaded Succesfully");
                }
            });

            var Collection_id="stranger";

            // rekognition.createCollection({
            //     CollectionId: Collection_id
            // },(err,data)=>{
            //     if(err)
            //     console.log(err);
            //     else
            //     {
            //         console.log("Collection Created Successfully");
            //     }
            // });

            rekognition.indexFaces({
                CollectionId: Collection_id,
                Image:{
                    S3Object:{
                        Bucket: bucketName,
                        Name: objectKey
                    }
                }
            },(err,data)=>{
                if(err)
                console.log(err);
                else
                {
                    console.log("Indexed Successfully");
                }
            });

            rekognition.searchFacesByImage({
                CollectionId: Collection_id,
                Image:{
                    S3Object:{
                        Bucket: bucketName,
                        Name: strangerobjectKey
                    }
                }
            },(err,data)=>{
                if(err)
                console.log(err);
                else
                {
                    // res.send(data);
                    // console.log(data.FaceMatches, data.FaceMatches.length);

                    if(data.FaceMatches.length)
                    {
                    res.render("stranger",{similarity: data.FaceMatches[0].Similarity, faceid: data.FaceMatches[0].Face.FaceId, confidence: data.FaceMatches[0].Face.Confidence, dataview: "", nomatchview: "hidden"})
                    }

                    else
                    {
                      res.render("stranger", {similarity: "0", faceid: "0", confidence: "0",dataview: "hidden", nomatchview: ""});
                    }
                }
            })           
        });
   }
});

/*-------------IMAGE PROCESS END----------------------------*/



/*-------------VIDEO PROCESS START----------------------------*/

/*-------------VIDEO UPLOAD START----------------------------*/

app.post("/videoUpload", upload.single('video'), (req,res)=>{
    var video=req.file;

    objectKey = 'video/' + video.originalname;

    const fileContent = fs.readFileSync(video.path);

    const params = {
        Bucket: bucketName,
        Key: objectKey,
        Body: fileContent
      };

      s3.upload(params,(err,data)=>{
        if(err)
        console.log(err);
        else
        {
            // console.log("Video Uploaded Succesfully");
            res.render("videoactions");
        }
      });
});

/*-------------VIDEO UPLOAD END----------------------------*/

/*-------------VIDEO ACTION START----------------------------*/

app.post("/videoaction", (req,res)=>{
    var action=req.body.btn;

    const params ={
        Video:{
            S3Object:{
                Bucket: bucketName,
                Name: objectKey
            }
        }
    }

    //-----------CELEBRITY DETECTION----------//

    if(action=="celebrity")
    {
        rekognition.startCelebrityRecognition(params,(err,data)=>{
            if(err)
            console.log(err);
            else
            {
                let job_id = data.JobId;
          
                const gtparams={
                  JobId: job_id
                }
          
                const checkJobStatus = async()=>{
          
                  try{
                  const data= await rekognition.getCelebrityRecognition(gtparams).promise();
                    
                      // console.log(data);
              
                      if(data.JobStatus==="IN_PROGRESS")
                      {
                        // res.render("waiting");
                        // console.log("Recheck in 5Sec");
                        setTimeout(checkJobStatus, 5000);
                      }
                      else if(data.JobStatus==="SUCCEEDED")
                      {
                        // res.send(data);
                        if(data.Celebrities.length)
                        res.render("celebrity",{celebrities: data.Celebrities, celebsdataview: "", nomatchview: "hidden"})

                        else
                        res.render("celebrity",{celebrities: [], celebsdataview: "hidden", nomatchview: ""})
                      }
                      else
                      {
                        console.log("Failed");
                      }
                    }
                    catch(err){
                      console.log(err);
                    }
                };
          
                checkJobStatus();
            }
          });
    }

    //-----------FACES DETECTION----------//

    if(action=="face")
    {
        rekognition.startFaceDetection(params,(err,data)=>{
            if(err)
            console.log(err);
            else
            {
                let job_id = data.JobId;
          
                const gtparams={
                  JobId: job_id
                }
          
                const checkJobStatus = async()=>{
          
                  try{
                  const data= await rekognition.getFaceDetection(gtparams).promise();
                    
                      // console.log(data);
              
                      if(data.JobStatus==="IN_PROGRESS")
                      {
                        // console.log("Recheck in 5Sec");
                        setTimeout(checkJobStatus, 5000);
                      }
                      else if(data.JobStatus==="SUCCEEDED")
                      {
                        // res.send(data);
                        if(data.Faces.length)
                        res.render("face_detection",{faces: data.Faces, facedataview: "", nomatchview: "hidden"})

                        else
                        res.render("face_detection",{faces: [], facedataview: "hidden", nomatchview: ""})
                      }
                      else
                      {
                        console.log("Failed");
                      }
                    }
                    catch(err){
                      console.log(err);
                    }
                };
          
                checkJobStatus();
            }
          });
    }

    //-----------PERSON TRACKING----------//

    if(action=="track")
    {
        rekognition.startPersonTracking(params,(err,data)=>{
            if(err)
            console.log(err);
            else
            {
                let job_id = data.JobId;
          
                const gtparams={
                  JobId: job_id
                }
          
                const checkJobStatus = async()=>{
          
                  try{
                  const data= await rekognition.getPersonTracking(gtparams).promise();
                    
                      console.log(data);
              
                      if(data.JobStatus==="IN_PROGRESS")
                      {
                        console.log("Recheck in 5Sec");
                        setTimeout(checkJobStatus, 5000);
                      }
                      else if(data.JobStatus==="SUCCEEDED")
                      {
                        res.send(data);
                      }
                      else
                      {
                        console.log("Failed");
                      }
                    }
                    catch(err){
                      console.log(err);
                    }
                };
          
                checkJobStatus();
            }
          });
    }

    //-----------TEXT DETECTION----------//

    if(action=="text")
    {
        rekognition.startTextDetection(params,(err,data)=>{
            if(err)
            console.log(err);
            else
            {
                let job_id = data.JobId;
          
                const gtparams={
                  JobId: job_id
                }
          
                const checkJobStatus = async()=>{
          
                  try{
                  const data= await rekognition.getTextDetection(gtparams).promise();
                    
                      // console.log(data);
              
                      if(data.JobStatus==="IN_PROGRESS")
                      {
                        // console.log("Recheck in 5Sec");
                        setTimeout(checkJobStatus, 5000);
                      }
                      else if(data.JobStatus==="SUCCEEDED")
                      {
                        //   console.log(data);
                        // res.send(data);

                        if(data.TextDetections.length)
                        res.render("text",{text: data.TextDetections, textdataview:"", nomatchview:"hidden"});

                        else
                        res.render("text",{text: [], textdataview:"hidden", nomatchview:""});
                      }
                      else
                      {
                        console.log("Failed");
                      }
                    }
                    catch(err){
                      console.log(err);
                    }
                };
          
                checkJobStatus();
            }
          });
    }

    //-----------SEGMENT DETECTION----------//

    if(action=="segment")
    {

      const segmentParams ={
        Video:{
            S3Object:{
                Bucket: bucketName,
                Name: objectKey
            }
        },
        SegmentTypes: [ "SHOT", "TECHNICAL_CUE" ],
        }

        rekognition.startSegmentDetection(segmentParams,(err,data)=>{
            if(err)
            console.log(err);
            else
            {
                const gtparams={
                    JobId: data.JobId
                }
                const checkJobStatus = async()=>{
                    
                    try{
                        const data=await rekognition.getSegmentDetection(gtparams).promise();

                        // console.log(data);

                        if(data.JobStatus==="IN_PROGRESS")
                        {
                            console.log("Recheck in 5Sec");
                            setTimeout(checkJobStatus, 5000);
                        }
                        else if(data.JobStatus==="SUCCEEDED")
                        {
                            // res.send(data);

                            if(data.Segments.length)
                            res.render("segment",{segments: data.Segments, techcueview: "", nomatchview: "hidden"});

                            else
                            res.render("segment",{segments: [], techcueview: "hidden", nomatchview: ""});
                        }
                        else
                        {
                            console.log("Failed");
                        }
                    }

                    catch(err)
                    {
                        console.log(err);
                    }
                };
                checkJobStatus();
            }
        })
    }

    //-----------LABEL DETECTION----------//

    if(action=="label")
    {
        rekognition.startLabelDetection(params,(err,data)=>{
            if(err)
            console.log(err);

            else
            {
                const gtparams={
                    JobId: data.JobId
                }

                const checkJobStatus = async()=>{
                    try{
                        const data=await rekognition.getLabelDetection(gtparams).promise();

                        // console.log(data);

                        if(data.JobStatus==="IN_PROGRESS")
                        {
                            // console.log("Recheck in 5Sec");
                            setTimeout(checkJobStatus, 5000);
                        }
                        else if(data.JobStatus==="SUCCEEDED")
                        {
                            // res.send(data);

                            if(data.Labels.length)
                            res.render("videolabel",{labels: data.Labels, labelview: "", nomatchview: "hidden"})

                            else
                            res.render("videolabel",{labels: [], labelview: "hidden", nomatchview: ""})
                        }
                        else
                        {
                            console.log("Failed");
                        }
                    }

                    catch(err)
                    {
                        console.log(err);
                    }                    
                };
                checkJobStatus();
            }
        })
    }

    //-----------SEARCH FOR A FACE (needs Collection)----------//

    if(action=="faceSearch")
    {
      const faceParams ={
        Video:{
            S3Object:{
                Bucket: bucketName,
                Name: objectKey
            }
        },
        CollectionId: "stranger",
    }
        rekognition.startFaceSearch(faceParams,(err,data)=>{
            if(err)
            console.log(err);

            else
            {
                const gtparams={
                    JobId: data.JobId
                }

                const checkJobStatus = async()=>{
                    try{
                        const data=await rekognition.getFaceSearch(gtparams).promise();

                        // console.log(data);

                        if(data.JobStatus==="IN_PROGRESS")
                        {
                            console.log("Recheck in 5Sec");
                            setTimeout(checkJobStatus, 5000);
                        }
                        else if(data.JobStatus==="SUCCEEDED")
                        {
                            //   console.log(data);
                            // res.send(data);

                            let identified = [];

                            data.Persons.forEach(function(person){
                              if(person.FaceMatches.length)
                              identified.push(person);
                            });

                            // res.send(identified);

                            if(identified.length)
                            {
                              res.render("identified_face",{persons: identified, identifiedview: "", nomatchview: "hidden"});
                            }

                            else
                            {
                              res.render("identified_face",{persons: [], identifiedview: "hidden", nomatchview: ""});
                            }
                        }
                        else
                        {
                            console.log("Failed");
                        }
                    }

                    catch(err)
                    {
                        console.log(err);
                    }                    
                };
                checkJobStatus();
            }
        })
    }
});

app.post("/webcamUpload", (req,res)=>{ 

const webcamCapture = new cv.VideoCapture(0); 

const rekognition = new AWS.Rekognition();

const processFrames = async () => {
  
  while (true) {
    const frame = webcamCapture.read();

    if (!frame.empty) {
      const frameBuffer = cv.imencode('.jpg', frame).toString('base64');

      const detectLabelsParams = {
        Image: {
          Bytes: Buffer.from(frameBuffer, 'base64'),
        },
      };

      const detectFacesParams = {
        Image: {
          Bytes: Buffer.from(frameBuffer, 'base64'),
        },
        Attributes : ["ALL"]
      };

      try {
        const [labelResults, faceResults] = await Promise.all([
          rekognition.detectLabels(detectLabelsParams).promise(),
          rekognition.detectFaces(detectFacesParams).promise(),
        ]);

        const detectedObjects = labelResults.Labels;

        for (const obj of detectedObjects) {
            
            if (obj.Instances && obj.Instances.length > 0 && obj.Instances[0].BoundingBox && obj.Confidence >= 70) {
              // console.log(obj);
              const box = obj.Instances[0].BoundingBox;
  
              const x = box.Left * frame.cols;
              const y = box.Top * frame.rows;
              const width = box.Width * frame.cols;
              const height = box.Height * frame.rows;

              if (x >= 0 && y >= 0 && x + width <= frame.cols && y + height <= frame.rows) {
                frame.drawRectangle(new cv.Rect(x, y, width, height), new cv.Vec(100, 255, 0), 2);
  
                const text = obj.Name;
                const textSize = 0.8;
                const textThickness = 1;
                const textFont = cv.FONT_HERSHEY_TRIPLEX;
                const textBaseline = 0;
                const textColor = new cv.Vec(0, 0, 255); 
                const textBottomLeft = new cv.Point2(x, y - 10); 
                frame.putText(text, textBottomLeft, textFont, textSize, textColor, textThickness, textBaseline);
              }
            }
          }

        const detectedFaces = faceResults.FaceDetails;

        for (const face of detectedFaces) {
          const boundingBox = face.BoundingBox;
          const x = boundingBox.Left * frame.cols;
          const y = boundingBox.Top * frame.rows;
          const width = boundingBox.Width * frame.cols;
          const height = boundingBox.Height * frame.rows;

          if (x >= 0 && y >= 0 && x + width <= frame.cols && y + height <= frame.rows) {
            frame.drawRectangle(new cv.Rect(x, y, width, height), new cv.Vec(255, 0, 0), 2); 

             const emotion = face.Emotions[0];
             const ageRange = `${face.AgeRange.Low} - ${face.AgeRange.High}`;
 
             const text = `Emotion: ${emotion.Type} || Age Range: ${ageRange}`;
             const textSize = 0.5;
             const textThickness = 1;
             const textFont = cv.FONT_HERSHEY_TRIPLEX;
             const textBaseline = 0;
             const textColor = new cv.Vec(240, 222, 54);
             const textBottomLeft = new cv.Point2(x, y - 20); 
             frame.putText(text, textBottomLeft, textFont, textSize, textColor, textThickness, textBaseline);
          }
        }

        const resizedFrame = await frame.resizeAsync(720, 1280);

        cv.imshow('Webcam', resizedFrame);
        const key = cv.waitKey(30);

        // console.log("Key: "+key);

        // If 'Esc' key is pressed, stop the process
        if (key === 27) {
          console.log('Webcam object detection stopped.');
          cv.destroyAllWindows();
          webcamCapture.release();
          res.render("index");
          break;
        }
      } catch (error) {
        console.error('Error detecting objects or faces:', error);
      }
    }
  }
};


processFrames();
});

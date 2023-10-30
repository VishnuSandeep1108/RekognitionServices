# RekognitionServices
Built using Node.js, It offers powerful label detection and facial microservices like age and mood detection leveraging AWS Rekognition for label detection and facial analysis and OpenCV for webcam integration, this platform allows users to upload images and videos or use their webcams for real-time analysis.

## Features

- **Image and Video Analysis**: Utilizes AWS Rekognition and OpenCV to offer label detection and facial analysis services, enhancing both images and videos.
- **Age and Mood Detection**: Provides users with age and mood detection features for facial analysis.
- **User-Friendly Interface**: Implements an intuitive user interface, allowing users to effortlessly upload their media files or use their webcam for real-time analysis.
- **Tech Stack**: Developed with NodeJS, ExpressJS, AWS Rekognition SDK, OpenCV, and AWS S3 for efficient development and cloud-based storage.

## Installation

### Prerequisites
1. Install CMAKE from `https://cmake.org/download/`
2. Download OpenCV release compatible with your system from `https://opencv.org/releases/`
3. unzip the contents
4. Using Console, navigate to the root directory of the unzipped folder and create new folder `build` using `$ mkdir build`
5. Navigate to build directory and install opencv using `$ cmake ../`
6. After installation is done, it's time to build opencv, stay in the `build` direactory and run `$ make`
7. This may take a while, generally 1-2 hours, depending your Internet Speed
8. After the uild is completed, note the locations of `bin`, `lib`, `include` directories inside build folder
9. Add them to environment variables using names `OPENCV_BIN_DIR`, `OPENCV_LIB_DIR` and `OPENCV_INCLUDE_DIR` respectively

### Clone Repo

10. Now that the pre-requisites are done, it's time to clone the repo
```
git clone https://github.com/VishnuSandeep1108/RekognitionServices
```
12. Change the locations in `package.json` under opencv4nodejs to the actual locations of your bin, lib and include directories and save it
13. Now, install the dependencies using `npm install` at root directory of the repo
14. After it's done, run `node app.js` and visit `https://localhost:3000/`

## Usage

Upload an image or video from the local device, or open webcam to start object detection through the webcam

"use strict";
// Required Dependencies Import
const express = require("express");
const multer = require("multer");
const mongoose = require("mongoose");
const cloudinary = require("cloudinary").v2;
const bodyParser = require("body-parser");
const https = require("https");
const ejs = require("ejs");
const app = express();
const _ = require("lodash");
const { hasSubscribers } = require("diagnostics_channel");
const { type } = require("os");
require("dotenv").config();


// Assigned Imported Dependencies
app.set("view engine", "ejs");
app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: true }));

// Database, MongoDB and Cloudinary.
// For MongoDB
let mongoPass = process.env.MONGODB_PASSWORD;
mongoose.connect("mongodb+srv://chukwugodgive:" + mongoPass + "@cluster0.ijmiqmk.mongodb.net/techblogDB");
// mongoose.connect("mongodb://127.0.0.1:27017/techblogDB");
const blogPostSchema = new mongoose.Schema({
    imageUrl: String,
    imageId: String,
    author: String,
    date: String,
    time: String,
    postTitle: String,
    postBody: String,
    category: String
});
const BlogPost = mongoose.model("blogpost", blogPostSchema);

const feedbackSchema = new mongoose.Schema({
    name: String,
    message:String,
    email: String
});
const Feedback = mongoose.model("feedback", feedbackSchema);

const adminSchema = new mongoose.Schema({
    username: String,
    password: String,
    profileUrl: String,
    profileId: String
});
const Admin = mongoose.model("admin", adminSchema)

const subscriberSchema = new mongoose.Schema({
    date: {
        type: Date,
        default: Date.now
    },
    email: String
});
const Subscriber = mongoose.model("subscriber", subscriberSchema);

// For Cloudinary
//Cloudinary configuration setups.
cloudinary.config({
    cloud_name: process.env.CLOUD_NAME,
    api_key: process.env.API_KEY,
    api_secret: process.env.API_SECRET,
    secure: true
});

// Multer for upload to cloudinary
const uploader = multer({
    storage: multer.diskStorage({}),
    limits: {fileSize: 1000000}
});

// Options to set or arrange the image on cloudinary
const uploadOptions = {
    use_filename: true,
    unique_filename: false,
    overwrite: true,
    folder: "TechBlog"
};

// Home
app.get("/", (req, res) => {
    BlogPost.find({}).then((allFoundPost) => {
        let reversedAllPost = allFoundPost.reverse();
        Admin.findOne({username: "admin"}).then((profileFound) => {
            let adminPix = profileFound.profileUrl;
            res.render("users/home", {
                AllFoundPosts: reversedAllPost, 
                AdminProfile: adminPix,
                Warning: "",
                Notice: ""
            });  
        });
    });
});

// This handles email subscription post powered by mailchimp
app.post("/", (req, res) => {
    let usersEmail = req.body.TechBlogSubscribe;
    // MailChimp
    const mailChimpListId = process.env.MAILCHIMP_LIST_ID;
    const  mailUrl = "https://us13.api.mailchimp.com/3.0/lists/" + mailChimpListId;
    const data = {
        members: [{
            email_address: usersEmail,
            status: "subscribed"
        }]
    };
    const convertedToObject = JSON.stringify(data)
    const options = {
        method: "POST",
        auth: process.env.MAILCHIMP_API
    };
    
    Subscriber.findOne({email:usersEmail}).then((found) => {
        if (found === null) {
            // MailChimp
            const mailRequest = https.request(mailUrl, options, (response) => {
                if (response.statusCode === 200) {
                    BlogPost.find({}).then((allFoundPost) => {
                        let reversedAllPost = allFoundPost.reverse();
                        let subscribed = new Subscriber({email: usersEmail})
                        subscribed.save();
                        Admin.findOne({username: "admin"}).then((profileFound) => {
                            let adminPix = profileFound.profileUrl;
                            res.render("users/home", {
                                AllFoundPosts: reversedAllPost, 
                                AdminProfile: adminPix,
                                Warning: "",
                                Notice: "Thank You for Subscribing to TechBlog"
                            });  
                        });
                    });
                } else {
                    BlogPost.find({}).then((allFoundPost) => {
                        let reversedAllPost = allFoundPost.reverse();
                        Admin.findOne({username: "admin"}).then((profileFound) => {
                            let adminPix = profileFound.profileUrl;
                            res.render("users/home", {
                                AllFoundPosts: reversedAllPost, 
                                AdminProfile: adminPix,
                                Warning: "Failed please try again",
                                Notice: ""
                            });  
                        });
                    });
                };
                // To get the response of mailchimp data
                res.on("data", (data) => {
                })
            });
            // To submit the contents of our users email to mailchimp
            mailRequest.write(convertedToObject);
            mailRequest.end();
            
        } else {
            BlogPost.find({}).then((allFoundPost) => {
                let reversedAllPost = allFoundPost.reverse();
                Admin.findOne({username: "admin"}).then((profileFound) => {
                    let adminPix = profileFound.profileUrl;
                    res.render("users/home", {
                        AllFoundPosts: reversedAllPost, 
                        AdminProfile: adminPix,
                        Warning: "Email already exist!",
                        Notice: ""
                    });  
                });
            });
        }
    }) 
});

// Feedback, Login and Admin Get Method
app.get("/:pages", (req, res) => {
    let page = _.lowerCase(req.params.pages);

    // Feedback
    if (page === "feedback") {
        Admin.findOne({username: "admin"}).then((profileFound) => {
            let adminPix = profileFound.profileUrl;
            res.render("users/feedback", {AdminProfile: adminPix, Empty: ""});
        });
    } else // Login
    if (page === "login") {
        Admin.findOne({username: "admin"}).then((profileFound) => {
            let adminPix = profileFound.profileUrl;
            res.render("users/login", {AdminProfile: adminPix, Wrong: ""});
        });
    } else //Admin
    if (page === "admin") {
        Admin.findOne({username: "admin"}).then((profileFound) => {
            let adminPix = profileFound.profileUrl;
            res.render("admin/admin", {AdminProfile: adminPix});
        });
    } else {
        Admin.findOne({username: "admin"}).then((profileFound) => {
            let adminPix = profileFound.profileUrl;
            res.render("404", {
                AdminProfile: adminPix
            });
        });
    }
})

// Feedback and Login Post Method 
// Feedback Post Method
app.post("/:pages", (req, res) => {
    let page = _.lowerCase(req.params.pages);
    // feedback
    if (page === "feedback") {
        let senderName = req.body.SenderName;
        let senderEmail = req.body.SenderEmail;
        let senderMessage = req.body.SenderMessage;

        if (senderName != "" && senderMessage != "") {
            let feedback = new Feedback({
                name: senderName,
                message: senderMessage,
                email: senderEmail
            });
            feedback.save();
            res.redirect("/feedback");
        } else {
            res.render("users/feedback", {Empty: "Please fill the required fields"});
        };
    }

    // login
    if (page === "login") {
        let username = req.body.Username;
        let password = req.body.Password;
    
        Admin.find({}).then((admin) => {
            admin.forEach((adminData) => {
                if (username === adminData.username && password === adminData.password) {
                    res.redirect("admin");
                } else {
                    res.render("users/login", {AdminProfile: adminData, Wrong: "*wrong login details"});
                }
            });
        });
    }
})


// Blog Posts All Full Pages
app.get("/posts/:post", (req, res) => {
    let blog = _.lowerCase(req.params.post);

    BlogPost.find({}).then((allFoundPost) => {
        let reversedAllPost = allFoundPost.reverse();

        BlogPost.findOne({postTitle:_.startCase(blog)}).then((posts) => {
            if (posts != null) {
                Admin.findOne({username: "admin"}).then((profileFound) => {
                    let adminPix = profileFound.profileUrl;
                    res.render("users/post", {
                        AdminProfile: adminPix, 
                        FullPost: posts, 
                        BlogSideBar: reversedAllPost
                    });
                });
            } else {
                Admin.findOne({username: "admin"}).then((profileFound) => {
                    let adminPix = profileFound.profileUrl;
                    res.render("404", {
                        AdminProfile: adminPix
                    });
                });
            }
        })
    });
});

// Compose, settings, published,
app.get("/admin/:admin", (req, res) => {
    let routeUrl = _.lowerCase(req.params.admin);

    // Compose Get Method
    if (routeUrl === "compose") {
        res.render("admin/" + routeUrl, {Empty: ""})
    } else // Published Get Method
    if (routeUrl === "published") {
        BlogPost.find({}).then((blogPosts) => {
            if (blogPosts != null) {
                res.render("admin/" + routeUrl, {
                    Empty: "",
                    Post: blogPosts
                });
            } else {
                res.render("admin/" + routeUrl, {
                    Empty: "You have not published any post yet!"
                });
            };
        });
    } else // Feedback Display Get Method
    if (routeUrl === "feedback") {
        Feedback.find({}).then((feedbacks) => {
            if (feedbacks != null) {
                res.render("admin/" + routeUrl, {
                    Empty: "",
                    Message: feedbacks
                });
            } else {
                res.render("admin/" + routeUrl, {
                    Empty: "You have not published any post yet!"
                });
            };
        });
    }else // Settings Get Method
    if (routeUrl === "settings") {
        res.render("admin/" + routeUrl);
    }else {
        res.render("admin/404")
    }
});

app.post("/admin/:admin", uploader.single("PostImage"), async (req, res) => {
    let postUrl = _.lowerCase(req.params.admin);
    // Date and Time stamp
    let dateOption = {month: "long", day: "numeric", year: "numeric"};
    let currentDate = new Date().toLocaleString("en-GB", dateOption);
    let currentTime = new Date().toLocaleTimeString("en-GB");

    // Compose Post
    if (postUrl === "compose") {
        let postTitle = _.startCase(req.body.PostTitle);
        let postBody = req.body.PostBody;
        let postCategory = req.body.Category;
        let postAuthor = _.startCase(req.body.Author);
        
        if (postTitle !== "" && postBody !== "" && postAuthor !== "" && req.file.path !== null) {
            const upload = await cloudinary.uploader.upload(req.file.path, uploadOptions)
            .then((receivedImage) => {
                let postImageUrl = receivedImage.secure_url;
                let postImageId = receivedImage.public_id;
    
                const blogPost = new BlogPost({
                    imageUrl: postImageUrl,
                    imageId: postImageId,
                    author: postAuthor,
                    date: currentDate,
                    time: currentTime,
                    postTitle: postTitle,
                    postBody: postBody,
                    category: _.upperFirst(postCategory),
                });
                blogPost.save();
                res.redirect(postUrl)
            })
            .catch(error, (resp) => {
                console.log(error)
                console.log(resp)
                res.render("admin/" + postUrl, {Empty: error})
            });
        } else {
            res.render("admin/" + postUrl, {Empty: "Please fill the required fields"})
        };
    };

    // Published Post Method
    if (postUrl === "published") {
        if (req.body.Delete) {
            let toDelete = req.body.Delete
            BlogPost.findOneAndDelete({_id: toDelete}).then((returnedDatabase) => {
                const toDestroy = cloudinary.uploader.destroy(returnedDatabase.imageId, {invalidate: true})
                .then((returnedCloudinary) => {
                    res.redirect(postUrl)
                });
            })
        } else {
            // Need to be updated later
            res.redirect(postUrl)
        }
    }

    // Settings Post Method
    let uploadProfileOptions = {
        public_id: "techblog_admin_profile",
        folder: "TechBlog/Profile"
    };

    if (postUrl === "settings") {
        Admin.findOne({username: "admin"}).then((admin) => {
            const profileImageDelete = cloudinary.uploader.destroy(admin.imageId, {invalidate: true})
            .then((returnedDeleteResult) => {})
            const profileImageUpload = cloudinary.uploader.upload(req.file.path, uploadProfileOptions)
            .then((returnedUploadResult) => {
                Admin.updateOne({profileUrl: admin.profileUrl}, {profileUrl: returnedUploadResult.secure_url})
                .then((returnedUpdateResult) => {
                    res.redirect(postUrl)
                })
            })
        })
    };
});

// Port
let port = process.env.Port;
if (port === null || port === "") {
    port = 3000
}
app.listen(port, () => {
    console.log("Server started successfully");
});
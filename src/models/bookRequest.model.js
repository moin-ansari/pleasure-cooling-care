import mongoose from "mongoose";

const BookRequestSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    minlength: [2, 'Name must be at least 2 characters']
  },
  mobile: {
    type: String,
    required: [true, 'Mobile number is required'],
    minlength: [10, 'Mobile number must be at least 10 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    validate: {
      validator: function(value) {
        // Regular expression for email validation
        return /^[\w-]+(\.[\w-]+)*@([\w-]+\.)+[a-zA-Z]{2,7}$/.test(value);
      },
      message: 'Please enter a valid email'
    }
  },
  serviceType: {
    type: String,
    required: [true, 'Service type is required']
  },
  acType: {
    type: String,
    required: [true, 'AC type is required']
  },
  address: {
    type: String,
    required: [true, 'Address is required'],
    minlength: [10, 'Address must be at least 10 characters']
  }
});

const BookRequest = mongoose.models.bookRequests || mongoose.model("bookRequests", BookRequestSchema)

export default BookRequest
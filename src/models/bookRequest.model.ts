import mongoose, { Schema, Document } from "mongoose";

// Define custom type for status
type BookingStatus = "pending" | "completed" | "cancelled";

// Define interface for BookRequest document
interface IBookRequest extends Document {
  name: string;
  mobile: string;
  serviceType: string;
  acType: string;
  date: Date;
  time: string;
  status: BookingStatus;
  requestedDate: Date;
  streetAddress: string;
  city: string,
  zipcode: string;
  state: string;
  country: string;
}

// Define schema
const BookRequestSchema: Schema<IBookRequest> = new Schema({
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
  serviceType: {
    type: String,
    required: [true, 'Service type is required']
  },
  acType: {
    type: String,
    required: [true, 'AC type is required']
  },
  date: {
    type: Date,
    required: [true, 'Date is required']
  },
  time: {
    type: String,
    required: [true, 'Time is Required']
  },
  status: {
    type: String,
    required: [true, 'Status is required'],
    enum: ["pending", "completed", "cancelled"] as BookingStatus[],
  },
  requestedDate: {
    type: Date,
    required: [true, 'Requested date is required']
  },
  streetAddress: {
    type: String,
    required: [true, 'Street address is required']
  },
  city: {
    type: String,
    required: [true, 'City is required']
  },
  zipcode: {
    type: String,
    required: [true, 'zipcode is required']
  }, 
  state: {
    type: String,
    required: [true, 'state is required']
  }, 
  country: {
    type: String,
    required: [true, 'country is required']
  } 
});

// Check if the model already exists before defining it
const BookRequest = mongoose.models.bookRequests || mongoose.model<IBookRequest>("bookRequests", BookRequestSchema);

export default BookRequest;

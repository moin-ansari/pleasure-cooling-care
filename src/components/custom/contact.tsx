import { FaMapMarkerAlt, FaPhoneAlt , FaEnvelope, FaWhatsapp  } from 'react-icons/fa';

const Contact = () => {

    const contact = {
        mobile: "6395197294",
        whatsapp: "6395197294",
        email: "moinansari6395@gmail.com",
        address: "Bareilly, Uttar Pradesh, India (262407)"
    }

  return (
    <div id="contact" className="p-3">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl font-bold text-gray-800 text-center mb-8">Contact Me</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Phone */}
          <div className="flex items-center gap-4">
            <FaPhoneAlt  className="text-4xl text-blue-600 mb-2" />
            <p className="text-lg text-gray-800">{contact.mobile}</p>
          </div>
          {/* WhatsApp */}
          <div className="flex items-center gap-4">
            <FaWhatsapp className="text-4xl text-green-600 mb-2" />
            <p className="text-lg text-gray-800">{contact.whatsapp}</p>
          </div>
          {/* Email */}
          <div className="flex items-center gap-4">
            <FaEnvelope className="text-4xl text-red-600 mb-2" />
            <p className="text-lg text-gray-800">{contact.email}</p>
          </div>
          {/* Address */}
          <div className="flex items-center gap-4">
            <FaMapMarkerAlt className="text-4xl text-yellow-600 mb-2" />
            <p className="text-lg text-gray-800">{contact.address}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Contact;

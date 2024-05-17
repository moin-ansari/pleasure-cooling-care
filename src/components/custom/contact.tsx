import { FaMapMarkerAlt, FaPhoneAlt , FaEnvelope, FaWhatsapp  } from 'react-icons/fa';

const Contact = () => {

    const contact = {
        mobile: "6395197294",
        whatsapp: "6395197294",
        email: "moinansari6395@gmail.com",
        address: "Bareilly, Uttar Pradesh, India (262407)"
    }

  return (
    <div id="contact" className="px-3 py-8">
      <div className="md:w-1/2 md:mx-auto">
        <h2 className="text-3xl font-bold text-gray-800 text-center mb-8">Contact Me</h2>
        <div className="flex flex-col gap-4">
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

import { FaMapMarkerAlt, FaPhoneAlt, FaEnvelope, FaWhatsapp } from "react-icons/fa";
import { BUSINESS } from "@/constants/business";

const address = `${BUSINESS.address.locality}, ${BUSINESS.address.region}, India (${BUSINESS.address.postalCode})`;

const Contact = () => {
  const items = [
    { label: "Call us", value: BUSINESS.phone, href: `tel:+91${BUSINESS.phone}`, Icon: FaPhoneAlt, color: "text-blue-600" },
    { label: "WhatsApp", value: BUSINESS.whatsapp, href: `https://wa.me/91${BUSINESS.whatsapp}`, Icon: FaWhatsapp, color: "text-green-600" },
    { label: "Email", value: BUSINESS.email, href: `mailto:${BUSINESS.email}`, Icon: FaEnvelope, color: "text-red-600" },
    { label: "Address", value: address, href: undefined, Icon: FaMapMarkerAlt, color: "text-yellow-600" },
  ];

  return (
    <section id="contact" aria-labelledby="contact-heading" className="px-3 py-8">
      <div className="md:w-1/2 md:mx-auto">
        <h2 id="contact-heading" className="text-3xl font-bold text-gray-800 text-center mb-8">
          Contact us
        </h2>
        <ul className="flex flex-col gap-4">
          {items.map(({ label, value, href, Icon, color }) => (
            <li key={label} className="flex items-center gap-4">
              <Icon className={`text-3xl shrink-0 ${color}`} aria-hidden="true" />
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">{label}</p>
                {href ? (
                  <a href={href} className="text-lg text-gray-800 underline-offset-4 hover:underline break-words">
                    {value}
                  </a>
                ) : (
                  <p className="text-lg text-gray-800">{value}</p>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
};

export default Contact;

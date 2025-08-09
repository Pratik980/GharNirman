import React from "react";
import "./Contact.css";
import msg_icon from "../../assets/message-icon.png";
import mail_icon from "../../assets/mail-icon.png";
import phone_icon from "../../assets/phone-icon.png";
import location_icon from "../../assets/location-icon.png";
import white_arrow from "../../assets/white-arrow.png";

const Contact = () => {
  const [result, setResult] = React.useState("");

  const onSubmit = async (event) => {
    event.preventDefault();
    setResult("Sending....");
    const formData = new FormData(event.target);

    formData.append("access_key", "c817174e-a3c9-4d2e-adf9-5bbf2b175f5f");

    const res = await fetch("https://api.web3forms.com/submit", {
      method: "POST",
      body: formData,
    }).then((res) => res.json());

    if (res.success) {
      console.log("Form Submitted Successfully", res);
      setResult(res.message);
      event.target.reset();
    } else {
      console.log("Error", res);
      setResult(res.message);
    }
  };
  
  return (
    <div className="contact">
      <div className="contact-col">
        <h3>
          Send us a message <img src={msg_icon} alt="" />
        </h3>
        <p>
          We’d love to hear from you! Whether you have a question about our
          platform, need assistance with a tender, or just want to share
          feedback, our team is here to help. Feel free to reach out to us, and
          we’ll get back to you as soon as possible. Your insights and inquiries
          are valuable to us as we strive to improve and serve you better. Let’s
          build something great together!" Let me know if you want any
          modifications!
        </p>
        <ul>
          <li>
            <img src={mail_icon} alt="" />
            gharnirman@gmail.com
          </li>
          <li>
            <img src={phone_icon} alt="" />
            +977-9812345678
          </li>
          <li>
            <img src={location_icon} alt="" />
            Nepal
          </li>
        </ul>
      </div>
      <div className="contact-col">
        <form onSubmit={onSubmit}>
          <label>Your name</label>
          <input
            type="text"
            name="name"
            placeholder="Enter your name"
            required
          />
          <label>Phone Number</label>
          <input
            type="tel"
            name="phone"
            placeholder="Enter your mobile number"
            required
          />
          <label>Write your message here</label>
          <textarea
            name="message"
            rows="6"
            placeholder="Enter your message"
            required
          />
          <button type="submit" className="btn dark-btn">
            Submit now <img src={white_arrow} alt="" />
          </button>
        </form>
        <span>{result}</span>
      </div>
    </div>
  );
};

export default Contact;

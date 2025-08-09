import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Link as ScrollLink } from "react-scroll";
import "./Navbar.css";
import logo from "../../assets/logo.png";

const Navbar = () => {
  const [sticky, setSticky] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => {
      setSticky(window.scrollY > 50);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav className={`container ${sticky ? "dark-nav" : ""}`}>
      <Link to="/">
        <img src={logo} alt="Company Logo" className="logo" />
      </Link>
      <ul>
        <li>
          <ScrollLink to="hero" smooth={true} offset={0} duration={500}>
            Home
          </ScrollLink>
        </li>
        <li>
          <ScrollLink to="program" smooth={true} offset={-260} duration={500}>
            Our Services
          </ScrollLink>
    
          <ScrollLink to="contact" smooth={true} offset={-260} duration={500}>
            Contact Us
          </ScrollLink>
        </li>
        <li>
          <button className="btn" onClick={() => navigate("/login")}>
            Login/Signup
          </button>
        </li>
      </ul>
    </nav>
  );
};

export default Navbar;

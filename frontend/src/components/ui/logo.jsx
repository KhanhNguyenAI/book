import React from "react";
import { Link } from "react-router-dom";
import styled from "styled-components";

const Button = () => {
  return (
    <StyledWrapper>
      <Link to="/" className="button" data-text="Awesome">
        <span className="actual-text">&nbsp;Briona@Library&nbsp;</span>
        <span aria-hidden="true" className="hover-text">
          &nbsp;Briona@Library&nbsp;
        </span>
      </Link>
    </StyledWrapper>
  );
};

const StyledWrapper = styled.div`
  /* === removing default button style ===*/
  .button {
    margin: 0;
    height: auto;
    background: transparent;
    padding: 0;
    border: none;
    cursor: pointer;
  }

  /* button styling */
  .button {
    --border-right: 4px; /* Giảm border */
    --text-stroke-color: rgba(255, 255, 255, 0.6);
    --animation-color: #37ff8b;
    --fs-size: 1.6em; /* Giảm kích thước font */
    letter-spacing: 2px; /* Giảm letter spacing */
    text-decoration: none;
    font-size: var(--fs-size);
    font-family: "Arial";
    position: relative;
    text-transform: uppercase;
    color: transparent;
    -webkit-text-stroke: 1px var(--text-stroke-color);
  }
  /* this is the text, when you hover on button */
  .hover-text {
    position: absolute;
    box-sizing: border-box;
    content: attr(data-text);
    color: var(--animation-color);
    width: 0%;
    inset: 0;
    border-right: var(--border-right) solid var(--animation-color);
    overflow: hidden;
    transition: 0.5s;
    -webkit-text-stroke: 1px var(--animation-color);
  }
  /* hover */
  .button:hover .hover-text {
    width: 100%;
    filter: drop-shadow(0 0 23px var(--animation-color));
  }

  /* Responsive */
  @media (max-width: 768px) {
    .button {
      --fs-size: 1.4em;
      letter-spacing: 1px;
    }
  }

  @media (max-width: 480px) {
    .button {
      --fs-size: 1.2em;
      letter-spacing: 0.5px;
    }
  }
`;

export default Button;

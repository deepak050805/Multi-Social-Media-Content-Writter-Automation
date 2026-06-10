/* ============================================================
   MULTI SOCIAL MEDIA CONTENT GENERATOR — script.js
   ============================================================ */

/**
 * WEBHOOK CONFIGURATION
 * Change this single variable to point to your n8n webhook URL.
 */
const WEBHOOK_URL = "https://auto.technopixar.com/webhook/generate-content";


/* ============================================================
   DOM REFERENCES
   ============================================================ */

const form       = document.getElementById("contentForm");
const submitBtn  = document.getElementById("submitBtn");
const btnText    = submitBtn.querySelector(".btn-text");
const btnLoading = submitBtn.querySelector(".btn-loading");

const formCard   = document.getElementById("formCard");
const successCard = document.getElementById("successCard");
const errorCard   = document.getElementById("errorCard");
const errorMsg    = document.getElementById("errorMessage");

const resetBtn   = document.getElementById("resetBtn");
const retryBtn   = document.getElementById("retryBtn");

// Field + error elements
const fields = {
  fullName: {
    input: document.getElementById("fullName"),
    error: document.getElementById("fullNameError"),
  },
  email: {
    input: document.getElementById("email"),
    error: document.getElementById("emailError"),
  },
  idea: {
    input: document.getElementById("idea"),
    error: document.getElementById("ideaError"),
  },
};


/* ============================================================
   VALIDATION HELPERS
   ============================================================ */

/**
 * Returns true if the string is a reasonably valid email address.
 * @param {string} email
 * @returns {boolean}
 */
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

/**
 * Marks a field as invalid and shows an error message.
 * @param {string} fieldKey - Key in the `fields` object
 * @param {string} message  - Error text to display
 */
function setFieldError(fieldKey, message) {
  const { input, error } = fields[fieldKey];
  error.textContent = message;
  input.parentElement.classList.add("has-error");
  input.setAttribute("aria-invalid", "true");
}

/**
 * Clears error state from a single field.
 * @param {string} fieldKey
 */
function clearFieldError(fieldKey) {
  const { input, error } = fields[fieldKey];
  error.textContent = "";
  input.parentElement.classList.remove("has-error");
  input.removeAttribute("aria-invalid");
}

/**
 * Validates all form fields.
 * Returns an object { valid: boolean, data: { fullName, email, idea } }.
 */
function validateForm() {
  let valid = true;

  // Clear previous errors
  Object.keys(fields).forEach(clearFieldError);

  const fullName = fields.fullName.input.value.trim();
  const email    = fields.email.input.value.trim();
  const idea     = fields.idea.input.value.trim();

  if (!fullName) {
    setFieldError("fullName", "Please enter your full name.");
    valid = false;
  } else if (fullName.length < 2) {
    setFieldError("fullName", "Name must be at least 2 characters.");
    valid = false;
  }

  if (!email) {
    setFieldError("email", "Please enter your email address.");
    valid = false;
  } else if (!isValidEmail(email)) {
    setFieldError("email", "Please enter a valid email address.");
    valid = false;
  }

  if (!idea) {
    setFieldError("idea", "Please describe your content idea.");
    valid = false;
  } else if (idea.length < 10) {
    setFieldError("idea", "Please give a bit more detail (at least 10 characters).");
    valid = false;
  }

  return { valid, data: { fullName, email, idea } };
}


/* ============================================================
   UI STATE HELPERS
   ============================================================ */

/**
 * Sets the submit button into loading state.
 */
function setLoadingState() {
  submitBtn.disabled = true;
  btnText.hidden     = true;
  btnLoading.hidden  = false;
  btnLoading.removeAttribute("aria-hidden");
}

/**
 * Restores the submit button to its default state.
 */
function resetLoadingState() {
  submitBtn.disabled = false;
  btnText.hidden     = false;
  btnLoading.hidden  = true;
  btnLoading.setAttribute("aria-hidden", "true");
}

/**
 * Shows the success card and hides the form.
 */
function showSuccess() {
  formCard.hidden   = true;
  errorCard.hidden  = true;
  successCard.hidden = false;
  successCard.focus?.(); // Move focus for screen reader users
}

/**
 * Shows the error card with an optional custom message.
 * @param {string} [message] - Override the default error message
 */
function showError(message) {
  if (message) {
    errorMsg.textContent = message;
  }
  formCard.hidden   = true;
  successCard.hidden = true;
  errorCard.hidden  = false;
}

/**
 * Resets the entire UI back to the empty form.
 */
function resetUI() {
  // Clear all field values
  Object.values(fields).forEach(({ input }) => {
    input.value = "";
  });

  // Clear all errors
  Object.keys(fields).forEach(clearFieldError);

  // Restore button
  resetLoadingState();

  // Show form, hide result cards
  formCard.hidden    = false;
  successCard.hidden = true;
  errorCard.hidden   = true;

  // Reset error message to default
  errorMsg.textContent =
    "We couldn't reach the content generator. Please check your connection and try again.";

  // Scroll form into view
  formCard.scrollIntoView({ behavior: "smooth", block: "start" });
}


/* ============================================================
   WEBHOOK SUBMISSION
   ============================================================ */

/**
 * Sends the form data to the n8n webhook via POST.
 *
 * Payload structure:
 *   { "fullName": string, "email": string, "idea": string }
 *
 * @param {{ fullName: string, email: string, idea: string }} data
 * @returns {Promise<void>}
 */
async function submitToWebhook(data) {
  const response = await fetch(WEBHOOK_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      fullName: data.fullName,
      email:    data.email,
      idea:     data.idea,
    }),
  });

  // Treat any non-2xx response as an error
  if (!response.ok) {
    throw new Error(`Server responded with status ${response.status}`);
  }
}


/* ============================================================
   FORM SUBMIT HANDLER
   ============================================================ */

/**
 * Main submit handler — validates, sends, and handles UI transitions.
 * @param {SubmitEvent} event
 */
async function handleSubmit(event) {
  event.preventDefault();

  // 1. Validate fields
  const { valid, data } = validateForm();
  if (!valid) {
    // Focus the first field with an error
    const firstErrorKey = Object.keys(fields).find(
      (key) => fields[key].input.getAttribute("aria-invalid") === "true"
    );
    if (firstErrorKey) fields[firstErrorKey].input.focus();
    return;
  }

  // 2. Enter loading state
  setLoadingState();

  try {
    // 3. Send to webhook
    await submitToWebhook(data);

    // 4. Success
    showSuccess();
  } catch (err) {
    // 5. Handle errors gracefully
    console.error("Webhook submission failed:", err);

    // Provide a user-friendly message based on error type
    let userMessage =
      "We couldn't reach the content generator. Please check your connection and try again.";

    if (err.message.includes("Failed to fetch") || err.name === "TypeError") {
      userMessage =
        "Unable to connect. Please check your internet connection or ensure the webhook URL is correct.";
    } else if (err.message.includes("500")) {
      userMessage =
        "The server encountered an error. Please try again in a moment.";
    } else if (err.message.includes("404")) {
      userMessage =
        "The webhook endpoint was not found. Please verify your n8n configuration.";
    }

    showError(userMessage);
  } finally {
    // Always restore button state (even if showing result cards)
    resetLoadingState();
  }
}


/* ============================================================
   INLINE VALIDATION (clear errors on input)
   ============================================================ */

/**
 * Attaches real-time error clearing to each field so
 * validation errors disappear the moment the user starts typing.
 */
function attachInlineValidation() {
  Object.keys(fields).forEach((key) => {
    fields[key].input.addEventListener("input", () => {
      clearFieldError(key);
    });
  });
}


/* ============================================================
   NAVBAR — scroll effect
   ============================================================ */

/**
 * Adds a "scrolled" class to the navbar once the user
 * has scrolled past the top of the page.
 */
function initNavbarScroll() {
  const navbar = document.getElementById("navbar");
  if (!navbar) return;

  const handler = () => {
    navbar.classList.toggle("scrolled", window.scrollY > 40);
  };

  window.addEventListener("scroll", handler, { passive: true });
  handler(); // Run once on load
}


/* ============================================================
   NAVBAR — mobile hamburger menu
   ============================================================ */

/**
 * Toggles the mobile navigation menu open/closed.
 */
function initMobileMenu() {
  const hamburger  = document.getElementById("hamburger");
  const mobileMenu = document.getElementById("mobileMenu");
  if (!hamburger || !mobileMenu) return;

  hamburger.addEventListener("click", () => {
    const isOpen = hamburger.getAttribute("aria-expanded") === "true";
    hamburger.setAttribute("aria-expanded", String(!isOpen));
    mobileMenu.setAttribute("aria-hidden", String(isOpen));
    mobileMenu.classList.toggle("open", !isOpen);
  });

  // Close menu when a mobile link is clicked
  mobileMenu.querySelectorAll(".mobile-link").forEach((link) => {
    link.addEventListener("click", () => {
      hamburger.setAttribute("aria-expanded", "false");
      mobileMenu.setAttribute("aria-hidden", "true");
      mobileMenu.classList.remove("open");
    });
  });
}


/* ============================================================
   SMOOTH ANCHOR NAVIGATION
   ============================================================ */

/**
 * Offset scroll for anchor links to account for the fixed navbar.
 */
function initAnchorScroll() {
  const navbar = document.getElementById("navbar");

  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener("click", (e) => {
      const targetId = anchor.getAttribute("href");
      if (!targetId || targetId === "#") return;

      const target = document.querySelector(targetId);
      if (!target) return;

      e.preventDefault();

      const navHeight = navbar ? navbar.offsetHeight : 0;
      const targetTop = target.getBoundingClientRect().top + window.scrollY - navHeight - 16;

      window.scrollTo({ top: targetTop, behavior: "smooth" });
    });
  });
}


/* ============================================================
   RESET / RETRY BUTTON HANDLERS
   ============================================================ */

/** Returns to the form from the success card. */
function initResetButtons() {
  if (resetBtn) resetBtn.addEventListener("click", resetUI);
  if (retryBtn) retryBtn.addEventListener("click", resetUI);
}


/* ============================================================
   INIT — wire everything up on DOMContentLoaded
   ============================================================ */

document.addEventListener("DOMContentLoaded", () => {
  // Form submission
  form.addEventListener("submit", handleSubmit);

  // Real-time validation feedback
  attachInlineValidation();

  // Navbar scroll effect
  initNavbarScroll();

  // Mobile hamburger
  initMobileMenu();

  // Smooth anchor scrolling
  initAnchorScroll();

  // Reset/retry buttons
  initResetButtons();
});

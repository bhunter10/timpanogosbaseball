import Script from 'next/script';
import BodyClass from '../components/BodyClass';
import { withBasePath } from '../lib/base-path';

export const metadata = {
  title: 'Baseball Training | Timpanogos Baseball',
  description: 'Request baseball training appointments with Timpanogos coaches.'
};

export default function TrainPage() {
  return (
    <>
      <BodyClass />
      <link rel="stylesheet" href={withBasePath('/css/style-v2.css')} />
      <link rel="stylesheet" href={withBasePath('/css/train.css')} />
      <header className="v2-header">
        <div className="v2-header-inner">
          <a className="v2-brand" href={withBasePath('/')}>
            <img src={withBasePath('/images/twolves-wolf.svg')} alt="Timpanogos Wolves logo" decoding="async" />
            <span>Timpanogos Baseball</span>
          </a>
          <button type="button" className="v2-nav-toggle" id="v2NavToggle" aria-expanded="false" aria-controls="v2Nav" aria-label="Open navigation menu">
            <span></span>
            <span></span>
            <span></span>
          </button>
          <nav className="v2-nav" id="v2Nav">
            <a href={withBasePath('/')}>Program</a>
            <a href={withBasePath('/schedule')}>Schedule</a>
            <a href={withBasePath('/records')}>Records</a>
            <a href={withBasePath('/news')}>News</a>
            <a href={withBasePath('/gallery')}>Gallery</a>
            <a href={withBasePath('/roster')}>Roster</a>
            <a href={withBasePath('/swag')}>Swag</a>
          </nav>
        </div>
      </header>

      <main className="v2-train-page" id="top">
        <section className="v2-train-hero">
          <div className="v2-shell v2-train-hero-inner">
            <p className="v2-kicker">Baseball training</p>
            <h1>Book a Session</h1>
            <p>Choose a coach, find an open training time, and request an appointment with the Timpanogos baseball staff.</p>
          </div>
        </section>

        <section className="v2-train-booking v2-shell" aria-labelledby="trainBookingTitle">
          <div className="v2-train-heading">
            <div>
              <p className="v2-kicker">Calendar</p>
              <h2 id="trainBookingTitle">Training availability</h2>
            </div>
            <p id="trainStatus" className="v2-train-status" aria-live="polite">Loading trainers...</p>
          </div>

          <div className="v2-train-layout">
            <aside className="v2-train-trainers" aria-label="Choose a trainer">
              <h3>Coach</h3>
              <div id="trainerList" className="v2-trainer-list"></div>
            </aside>

            <div className="v2-train-calendar-panel">
              <div className="v2-train-calendar-toolbar">
                <button type="button" className="v2-train-icon-btn" id="trainPrevMonth" aria-label="Previous month">&lsaquo;</button>
                <h3 id="trainMonthLabel">Month</h3>
                <button type="button" className="v2-train-icon-btn" id="trainNextMonth" aria-label="Next month">&rsaquo;</button>
              </div>
              <div className="v2-train-weekdays" aria-hidden="true">
                <span>Sun</span><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span>
              </div>
              <div id="trainCalendarGrid" className="v2-train-calendar-grid" aria-label="Training calendar"></div>
            </div>

            <aside className="v2-train-slots" aria-label="Choose a time">
              <div>
                <p className="v2-kicker">Time slots</p>
                <h3 id="trainSelectedDateLabel">Select a date</h3>
              </div>
              <div id="trainSlotList" className="v2-train-slot-list"></div>
              <button type="button" className="v2-train-continue" id="trainContinueBtn" disabled>Continue</button>
            </aside>
          </div>
        </section>
      </main>

      <footer className="v2-footer">
        <div className="v2-header-inner">
          <p>&copy; Timpanogos High School Baseball</p>
          <a href={withBasePath('/admin-login')}>Admin</a>
        </div>
      </footer>

      <div className="v2-train-modal" id="trainRequestModal" hidden>
        <button type="button" className="v2-train-modal-backdrop" id="trainModalBackdrop" aria-label="Close appointment form"></button>
        <div className="v2-train-modal-card" role="dialog" aria-modal="true" aria-labelledby="trainModalTitle">
          <button type="button" className="v2-train-modal-close" id="trainModalClose" aria-label="Close appointment form">x</button>
          <div className="v2-train-modal-coach">
            <img id="trainModalCoachPhoto" src={withBasePath('/images/home/coach-talk-wide.jpg')} alt="" />
            <div>
              <p className="v2-kicker">Appointment request</p>
              <h2 id="trainModalTitle">Training session</h2>
              <p id="trainModalSpecialty"></p>
            </div>
          </div>
          <dl className="v2-train-details" id="trainModalDetails"></dl>
          <form id="trainRequestForm" className="v2-train-form">
            <label>Full name<input type="text" id="trainCustomerName" autocomplete="name" required /></label>
            <label>Cell phone number<input type="tel" id="trainCustomerPhone" autocomplete="tel" required /></label>
            <label>Email<input type="email" id="trainCustomerEmail" autocomplete="email" required /></label>
            <button type="submit" className="v2-train-request-btn">Request an appointment</button>
            <p className="v2-train-form-status" id="trainFormStatus" aria-live="polite"></p>
          </form>
        </div>
      </div>

      <Script src={withBasePath('/js/firebase-config.js')} strategy="afterInteractive" />
      <Script src={withBasePath('/js/train-appointments.js')} strategy="afterInteractive" />
    </>
  );
}

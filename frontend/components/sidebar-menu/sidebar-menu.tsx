'use client';

import { useEffect, useState, useRef, type MouseEvent } from 'react';
import styles from './sidebar-menu.module.scss';

export default function SidebarMenu() {
  const [isVisible, setIsVisible] = useState(false);
  const [activeSection, setActiveSection] = useState<string>('');
  const advantagesRef = useRef<HTMLElement | null>(null);
  const lamaRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const advantagesSection = document.getElementById('advantages');
    const lamaSection = document.querySelector('section[class*="lama"]') as HTMLElement;

    if (!advantagesSection || !lamaSection) return;

    advantagesRef.current = advantagesSection;
    lamaRef.current = lamaSection;

    const handleScroll = () => {
      if (!advantagesRef.current || !lamaRef.current) return;

      const advantagesTop = advantagesRef.current.offsetTop;
      const lamaTop = lamaRef.current.offsetTop;
      const scrollY = window.scrollY;
      const windowHeight = window.innerHeight;

      if (scrollY >= advantagesTop - windowHeight / 2 && scrollY < lamaTop - windowHeight / 3) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }

      const sections = [
        { id: 'users', element: document.getElementById('users') },
        { id: 'key-advantages', element: document.getElementById('key-advantages') },
        { id: 'advantages', element: advantagesRef.current },
        { id: 'pricing', element: document.getElementById('pricing') },
        { id: 'faq', element: document.getElementById('faq') },
      ];

      for (const section of sections) {
        if (section.element) {
          const rect = section.element.getBoundingClientRect();
          if (rect.top <= windowHeight / 2 && rect.bottom >= windowHeight / 2) {
            setActiveSection(section.id);
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll();

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const menuItems = [
    { id: 'wrench', href: '#advantages', sectionId: 'advantages' },
    { id: 'star', href: '#users', sectionId: 'users' },
    { id: 'comments', href: '#key-advantages', sectionId: 'key-advantages' },
    { id: 'pig', href: '#pricing', sectionId: 'pricing' },
    { id: 'qa', href: '#faq', sectionId: 'faq' },
  ];

  const handleClick = (e: MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault();
    const element = document.querySelector(href);
    if (element) {
      const rect = element.getBoundingClientRect();
      const targetY = window.scrollY + rect.top - (window.innerHeight / 2) + (rect.height / 2);
      window.scrollTo({ top: targetY, behavior: 'smooth' });
    }
  };

  return (
    <nav className={`${styles.sidebar} ${isVisible ? styles.visible : ''}`}>
      {menuItems.map((item) => (
        <a
          key={item.id}
          href={item.href}
          onClick={(e) => handleClick(e, item.href)}
          className={`${styles.menuItem} ${activeSection === item.sectionId ? styles.active : ''}`}
          aria-label={item.id}
        >
          <div className={styles.icon}>
            {item.id === 'wrench' && (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M14.7 6.30003C14.5168 6.48696 14.4141 6.73828 14.4141 7.00003C14.4141 7.26178 14.5168 7.5131 14.7 7.70003L16.3 9.30003C16.4869 9.48326 16.7382 9.58589 17 9.58589C17.2617 9.58589 17.5131 9.48326 17.7 9.30003L20.806 6.19503C21.126 5.87303 21.669 5.97503 21.789 6.41303C22.0911 7.5119 22.074 8.6741 21.7398 9.76362C21.4055 10.8531 20.7678 11.8249 19.9014 12.5653C19.0349 13.3056 17.9756 13.7839 16.8472 13.9441C15.7189 14.1043 14.5683 13.9399 13.53 13.47L5.61998 21.38C5.22215 21.7777 4.68264 22.0011 4.12012 22.001C3.55761 22.0009 3.01817 21.7774 2.62048 21.3795C2.22279 20.9817 1.99942 20.4422 1.99951 19.8797C1.99961 19.3172 2.22315 18.7777 2.62098 18.38L10.531 10.47C10.0611 9.43174 9.89668 8.28111 10.0569 7.15278C10.2171 6.02445 10.6954 4.96508 11.4357 4.09864C12.1761 3.23221 13.1479 2.59454 14.2374 2.26026C15.3269 1.92597 16.4891 1.9089 17.588 2.21103C18.026 2.33103 18.128 2.87303 17.807 3.19503L14.7 6.30003Z" stroke="url(#paint0_linear_1434_1171)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <defs>
                <linearGradient id="paint0_linear_1434_1171" x1="1.99951" y1="11.9987" x2="22.0037" y2="11.9987" gradientUnits="userSpaceOnUse">
                <stop stopColor="#3B82F6"/>
                <stop offset="0.5" stopColor="#2F67C3"/>
                <stop offset="0.75" stopColor="#295AAA"/>
                <stop offset="0.875" stopColor="#26539D"/>
                <stop offset="0.9375" stopColor="#244F96"/>
                <stop offset="1" stopColor="#234C90"/>
                </linearGradient>
                </defs>
              </svg>

            )}
              {item.id === 'star' && (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12.0006 2.00293L14.7206 9.51593L22.7306 10.6349L17.3636 15.8949L18.6476 23.8799L12.0006 20.0079L5.35363 23.8799L6.63763 15.8949L1.27063 10.6349L9.28063 9.51593L12.0006 2.00293Z" stroke="url(#paint0_linear_1434_1111)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <defs>
                <linearGradient id="paint0_linear_1434_1111" x1="3.43921" y1="11.7516" x2="20.5618" y2="11.7516" gradientUnits="userSpaceOnUse">
                <stop stopColor="#3B82F6"/>
                <stop offset="0.5" stopColor="#2F67C3"/>
                <stop offset="0.75" stopColor="#295AAA"/>
                <stop offset="0.875" stopColor="#26539D"/>
                <stop offset="0.9375" stopColor="#244F96"/>
                <stop offset="1" stopColor="#234C90"/>
                </linearGradient>
                </defs>
              </svg>
            )}
            {item.id === 'comments' && (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M20 2H4C2.9 2 2.01 2.9 2.01 4L2 22L6 18H20C21.1 18 22 17.1 22 16V4C22 2.9 21.1 2 20 2ZM20 16H5.17L4.58 16.59L4 17.17V4H20V16ZM10.5 14H18V12H12.5L10.5 14ZM14.36 8.13C14.56 7.93 14.56 7.62 14.36 7.42L12.59 5.65C12.39 5.45 12.08 5.45 11.88 5.65L6 11.53V14H8.47L14.36 8.13Z" fill="url(#paint0_linear_346_907)"/>
                <defs>
                <linearGradient id="paint0_linear_346_907" x1="2" y1="12" x2="22" y2="12" gradientUnits="userSpaceOnUse">
                <stop stopColor="#3B82F6"/>
                <stop offset="0.5" stopColor="#2F67C3"/>
                <stop offset="0.75" stopColor="#295AAA"/>
                <stop offset="0.875" stopColor="#26539D"/>
                <stop offset="0.9375" stopColor="#244F96"/>
                <stop offset="1" stopColor="#234C90"/>
                </linearGradient>
                </defs>
              </svg>


            )}
            {item.id === 'pig' && (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M15.0001 10.9999V11.0099M5.17307 8.3779C4.73447 8.0408 4.39762 7.589 4.19973 7.07242C4.00185 6.55585 3.95065 5.99463 4.05179 5.45077C4.15293 4.90692 4.40247 4.40162 4.77283 3.99072C5.14319 3.57982 5.61994 3.27933 6.15041 3.12244C6.68087 2.96556 7.24438 2.9584 7.77866 3.10175C8.31294 3.24511 8.79718 3.53339 9.17786 3.93475C9.55854 4.33611 9.82084 4.8349 9.93577 5.37601C10.0507 5.91712 10.0138 6.47946 9.82907 7.0009" stroke="url(#paint0_linear_1434_1296)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M16 4V7.803C17.2376 8.51919 18.1798 9.65249 18.658 11H19.999C20.2642 11 20.5186 11.1054 20.7061 11.2929C20.8937 11.4804 20.999 11.7348 20.999 12V14C20.999 14.2652 20.8937 14.5196 20.7061 14.7071C20.5186 14.8946 20.2642 15 19.999 15H18.657C18.321 15.95 17.75 16.8 16.999 17.473V19.5C16.999 19.8978 16.841 20.2794 16.5597 20.5607C16.2784 20.842 15.8968 21 15.499 21C15.1012 21 14.7197 20.842 14.4384 20.5607C14.157 20.2794 13.999 19.8978 13.999 19.5V18.917C13.6686 18.9725 13.3341 19.0003 12.999 19H8.99901C8.66395 19.0003 8.32945 18.9725 7.99901 18.917V19.5C7.99901 19.8978 7.84098 20.2794 7.55967 20.5607C7.27837 20.842 6.89684 21 6.49901 21C6.10119 21 5.71966 20.842 5.43835 20.5607C5.15705 20.2794 4.99901 19.8978 4.99901 19.5V17.473C4.09298 16.663 3.45429 15.5969 3.1675 14.4159C2.8807 13.2348 2.95933 11.9946 3.39296 10.8592C3.82659 9.72387 4.59478 8.74697 5.59585 8.05783C6.59692 7.36869 7.78367 6.9998 8.99901 7H11.499L16 4Z" stroke="url(#paint1_linear_1434_1296)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <defs>
                <linearGradient id="paint0_linear_1434_1296" x1="4.00122" y1="7.00458" x2="15.0001" y2="7.00458" gradientUnits="userSpaceOnUse">
                <stop stopColor="#3B82F6"/>
                <stop offset="0.5" stopColor="#2F67C3"/>
                <stop offset="0.75" stopColor="#295AAA"/>
                <stop offset="0.875" stopColor="#26539D"/>
                <stop offset="0.9375" stopColor="#244F96"/>
                <stop offset="1" stopColor="#234C90"/>
                </linearGradient>
                <linearGradient id="paint1_linear_1434_1296" x1="2.99805" y1="12.5" x2="20.999" y2="12.5" gradientUnits="userSpaceOnUse">
                <stop stopColor="#3B82F6"/>
                <stop offset="0.5" stopColor="#2F67C3"/>
                <stop offset="0.75" stopColor="#295AAA"/>
                <stop offset="0.875" stopColor="#26539D"/>
                <stop offset="0.9375" stopColor="#244F96"/>
                <stop offset="1" stopColor="#234C90"/>
                </linearGradient>
                </defs>
              </svg>
            )}
            {item.id === 'qa' && (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2C17.523 2 22 6.477 22 12C22 17.523 17.523 22 12 22C6.477 22 2 17.523 2 12C2 6.477 6.477 2 12 2ZM12 4C9.87827 4 7.84344 4.84285 6.34315 6.34315C4.84285 7.84344 4 9.87827 4 12C4 14.1217 4.84285 16.1566 6.34315 17.6569C7.84344 19.1571 9.87827 20 12 20C14.1217 20 16.1566 19.1571 17.6569 17.6569C19.1571 16.1566 20 14.1217 20 12C20 9.87827 19.1571 7.84344 17.6569 6.34315C16.1566 4.84285 14.1217 4 12 4ZM12 16C12.2652 16 12.5196 16.1054 12.7071 16.2929C12.8946 16.4804 13 16.7348 13 17C13 17.2652 12.8946 17.5196 12.7071 17.7071C12.5196 17.8946 12.2652 18 12 18C11.7348 18 11.4804 17.8946 11.2929 17.7071C11.1054 17.5196 11 17.2652 11 17C11 16.7348 11.1054 16.4804 11.2929 16.2929C11.4804 16.1054 11.7348 16 12 16ZM12 6.5C12.8423 6.50003 13.6583 6.79335 14.3078 7.3296C14.9573 7.86585 15.3998 8.61154 15.5593 9.43858C15.7188 10.2656 15.5853 11.1224 15.1818 11.8617C14.7783 12.601 14.1299 13.1768 13.348 13.49C13.2322 13.5326 13.1278 13.6014 13.043 13.691C12.999 13.741 12.992 13.805 12.993 13.871L13 14C12.9997 14.2549 12.9021 14.5 12.7272 14.6854C12.5522 14.8707 12.313 14.9822 12.0586 14.9972C11.8042 15.0121 11.5536 14.9293 11.3582 14.7657C11.1627 14.6021 11.0371 14.3701 11.007 14.117L11 14V13.75C11 12.597 11.93 11.905 12.604 11.634C12.8783 11.5245 13.1176 11.3423 13.2962 11.107C13.4748 10.8717 13.5859 10.5922 13.6176 10.2986C13.6493 10.0049 13.6004 9.70813 13.4762 9.44014C13.352 9.17215 13.1571 8.94307 12.9125 8.77748C12.6679 8.61189 12.3829 8.51606 12.0879 8.50027C11.793 8.48448 11.4993 8.54934 11.2384 8.68787C10.9775 8.8264 10.7593 9.03338 10.6072 9.28658C10.4551 9.53978 10.3748 9.82962 10.375 10.125C10.375 10.3902 10.2696 10.6446 10.0821 10.8321C9.89457 11.0196 9.64022 11.125 9.375 11.125C9.10978 11.125 8.85543 11.0196 8.66789 10.8321C8.48036 10.6446 8.375 10.3902 8.375 10.125C8.375 9.16359 8.75692 8.24156 9.43674 7.56174C10.1166 6.88192 11.0386 6.5 12 6.5Z" fill="url(#paint0_linear_1434_1244)"/>
                <defs>
                <linearGradient id="paint0_linear_1434_1244" x1="2" y1="12" x2="22" y2="12" gradientUnits="userSpaceOnUse">
                <stop stopColor="#3B82F6"/>
                <stop offset="0.5" stopColor="#2F67C3"/>
                <stop offset="0.75" stopColor="#295AAA"/>
                <stop offset="0.875" stopColor="#26539D"/>
                <stop offset="0.9375" stopColor="#244F96"/>
                <stop offset="1" stopColor="#234C90"/>
                </linearGradient>
                </defs>
              </svg>
            )}
          </div>
        </a>
      ))}
    </nav>
  );
}
import { Dialog, Transition } from '@headlessui/react';
import { Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';
import { Fragment, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { NavLink } from 'react-router-dom';
import { NAV_ITEMS } from '@/constants/nav';
import { useUser } from '@stackframe/react';

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const user = useUser();
  console.log('useUser in Layout.tsx:', user);

  return (
    <>
      <div className="min-h-full">
        <Transition.Root show={sidebarOpen} as={Fragment}>
          <Dialog as="div" className="relative z-40 lg:hidden" onClose={setSidebarOpen}>
            <div className="fixed inset-0 bg-gray-600 bg-opacity-75" />
            <div className="fixed inset-0 z-40">
              <div className="absolute inset-0 flex">
                <Dialog.Panel className="relative ml-auto flex h-full w-full max-w-xs flex-col overflow-y-auto bg-white py-4 pb-12 shadow-xl">
                  <div className="flex items-center justify-between px-4">
                    <h2 className="text-lg font-medium text-gray-900">
                      Sidebar
                    </h2>
                    <button
                      type="button"
                      className="-mr-2 flex h-10 w-10 items-center justify-center rounded-md bg-white p-2 text-gray-400"
                      onClick={() => setSidebarOpen(false)}
                    >
                      <span className="sr-only">Close sidebar</span>
                      <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                    </button>
                  </div>
                  <div className="mt-5 flex flex-col">
                    {NAV_ITEMS.map((item) => (
                      <NavLink
                        key={item.label}
                        to={item.path}
                        className={({ isActive }) =>
                          clsx(
                            'group flex items-center px-2 py-2 text-base font-medium rounded-md',
                            isActive
                              ? 'bg-gray-100 text-gray-900'
                              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                          )
                        }
                      >
                        <item.icon
                          className="mr-4 h-6 w-6 flex-shrink-0 text-gray-400"
                          aria-hidden="true"
                        />
                        {item.label}
                      </NavLink>
                    ))}
                  </div>
                </Dialog.Panel>
              </div>
            </div>
          </Dialog>
        </Transition.Root>

        {/* Static sidebar for desktop */}
        <div className="hidden lg:fixed lg:inset-y-0 lg:z-40 lg:flex lg:w-64 lg:flex-col">
          <div className="flex flex-col flex-1 border-r border-gray-200 bg-white pt-5 pb-4">
            <div className="flex items-center flex-shrink-0 px-4">
              <img
                className="h-8 w-auto"
                src="https://tailwindui.com/img/logos/mark.svg?color=indigo&shade=600"
                alt="Your Company"
              />
            </div>
            <div className="mt-5 flex-1 flex flex-col">
              <nav className="flex-1 px-2 pb-4 space-y-1">
                {NAV_ITEMS.map((item: { label: string; path: string; icon: any }) => (
                  <NavLink
                    key={item.label}
                    to={item.path}
                    className={({ isActive }) =>
                      clsx(
                        'group flex items-center px-2 py-2 text-sm font-medium rounded-md',
                        isActive
                          ? 'bg-gray-100 text-gray-900'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      )
                    }
                  >
                    <item.icon
                      className="mr-3 h-6 w-6 flex-shrink-0 text-gray-400"
                      aria-hidden="true"
                    />
                    {item.label}
                  </NavLink>
                ))}
              </nav>
            </div>
          </div>
        </div>

        <div className="lg:pl-64">
          <div className="sticky top-0 z-10 flex h-16 flex-shrink-0 border-b border-gray-200 bg-white shadow-sm">
            <button
              type="button"
              className="px-4 text-gray-500 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500 lg:hidden"
              onClick={() => setSidebarOpen(true)}
            >
              <span className="sr-only">Open sidebar</span>
              <Bars3Icon className="h-6 w-6" aria-hidden="true" />
            </button>
            <div className="flex flex-1 justify-between px-4 sm:px-6 lg:mx-auto lg:max-w-6xl lg:px-8">
              <div className="flex items-center">
                <h1 className="text-2xl font-semibold text-gray-900">
                  Dashboard
                </h1>
              </div>
              <div className="flex items-center">
                <button
                  type="button"
                  className="ml-5 flex-shrink-0 rounded-full bg-white p-1 text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                >
                  <span className="sr-only">View notifications</span>
                  <svg
                    className="h-6 w-6"
                    stroke="currentColor"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M15 17h5l-1.667-2.333A4 4 0 0118 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2.5"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M9 20v-6a2 2 0 00-2-2H4a2 2 0 01-2-2V6a2 2 0 012-2h6.5"
                    />
                  </svg>
                </button>
                <div className="ml-3 relative">
                  <div>
                    <span className="absolute right-0 top-0 block h-2 w-2 rounded-full bg-indigo-500 ring-2 ring-white" />
                  </div>
                  <button
                    type="button"
                    className="flex rounded-full bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                  >
                    <span className="sr-only">View profile</span>
                    <img
                      className="h-8 w-8 rounded-full"
                      src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80"
                      alt=""
                    />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <main className="flex-1">
            <div className="py-6 px-4 sm:px-6 lg:px-8">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </>
  );
}

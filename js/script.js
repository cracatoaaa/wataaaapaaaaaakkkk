const icons = {
  checking: 'https://telegra.ph/file/4166cc619f0e3439b34a7.gif',
  safe: 'https://telegra.ph/file/eeaeec6dcce9fe2226b10.gif',
  error: 'https://telegra.ph/file/038ef5808ac6586da192d.gif',
  blocked: 'https://telegra.ph/file/038ef5808ac6586da192d.gif'
};

document.addEventListener('DOMContentLoaded', () => {
  fetchUrls();
  setInterval(fetchUrls, 120000); // Polling every 2 minutes
});

function fetchUrls() {
  axios.get('/api/urls')
    .then(response => {
      const urls = response.data;
      const urlTableBody = document.getElementById('urlTableBody');
      urlTableBody.innerHTML = '';

      urls.forEach((url, index) => {
        const row = `<tr>
          <td>${index + 1}</td>
          <td>${url.url}</td>
          <td>${url.description}</td>
          <td>${getStatusHTML(url.status)}</td>
          <td>${url.lastChecked}</td>
          <td>
            <button class="btn btn-danger btn-sm" onclick="deleteUrl(${index})">Delete</button>
          </td>
        </tr>`;
        urlTableBody.innerHTML += row;
      });
    })
    .catch(error => console.error('Error fetching URLs:', error));
}

function addUrl() {
  const url = document.getElementById('url').value;
  const description = document.getElementById('description').value;

  axios.post('/api/urls', {
    url: url,
    description: description
  })
    .then(response => {
      console.log('URL added successfully:', response.data);
      fetchUrls();
    })
    .catch(error => {
      console.error('There was an error adding the URL:', error);
    });
}

async function editUrl(index) {
  const url = prompt('Enter new URL:');
  const description = prompt('Enter new Description:');

  await axios.put(`/api/urls/${index}`, { url, description });
  fetchUrls();
}

function deleteUrl(index) {
  axios.delete(`/api/urls/${index}`)
    .then(response => {
      console.log('URL deleted successfully:', response.data);
      fetchUrls();
    })
    .catch(error => {
      console.error('There was an error deleting the URL:', error);
    });
}

function getStatusHTML(status) {
  let spanClass = '';
  let iconUrl = '';

  switch (status) {
    case 'Checking':
      spanClass = 'status-checking';
      iconUrl = icons.checking;
      break;
    case 'Safe':
      spanClass = 'status-safe';
      iconUrl = icons.safe;
      break;
    case 'Error':
    case 'Blocked':
      spanClass = 'status-error';
      iconUrl = icons.blocked;
      break;
    default:
      spanClass = '';
      iconUrl = '';
      break;
  }

  return `
    <span class="${spanClass}">
      <img src="${iconUrl}" class="status-icon" alt="${status}" width="20" height="20">
      ${status}
    </span>
  `;
}

document.addEventListener('DOMContentLoaded', () => {
  fetchUsers();

  fetch('/api/getUserRole')
    .then(response => response.json())
    .then(data => {
      if (data.role !== 'admin') {
        document.getElementById('manageUsersMenuItem').style.display = 'none';
      }
    });
});

function fetchUsers() {
  fetch('/api/users')
    .then(response => response.json())
    .then(users => {
      const userTableBody = document.getElementById('userTableBody');
      userTableBody.innerHTML = '';

      users.forEach((user, index) => {
        const row = `
          <tr>
            <td>${index + 1}</td>
            <td>${user.username}</td>
            <td>${user.role}</td>
            <td>
              <button class="btn btn-danger btn-sm" onclick="deleteUser(${user.id})">Delete</button>
            </td>
          </tr>
        `;
        userTableBody.innerHTML += row;
      });
    })
    .catch(error => console.error('Error fetching users:', error));
}

function addUser() {
  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;
  const role = document.getElementById('role').value;

  fetch('/api/users', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ username, password, role })
  })
  .then(response => response.json())
  .then(data => {
    if (data.success) {
      console.log('User added successfully:', data.user);
      fetchUsers();
      document.getElementById('addUserForm').reset();
    } else {
      console.error('Error adding user:', data.message);
    }
  })
  .catch(error => console.error('Error adding user:', error));
}

function deleteUser(id) {
  fetch(`/api/users/${id}`, {
    method: 'DELETE'
  })
  .then(response => response.json())
  .then(data => {
    if (data.success) {
      console.log('User deleted successfully:', data.user);
      fetchUsers();
    } else {
      console.error('Error deleting user:', data.message);
    }
  })
  .catch(error => console.error('Error deleting user:', error));
}

function checkDomains() {
  const domainList = document.getElementById("domainList").value;
  let domains = domainList.split("\n").filter(Boolean);
  domains = domains.slice(0, 100); // Limit to 100 domains

  if (domains.length === 0) {
    alert("Silahkan masukan daftar domain.");
    return;
  }

  Promise.all(domains.map(domain => {
    return fetch('/api/check-domains', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ domains: [domain] })
    }).then(response => response.json());
  }))
  .then(resultsArray => {
    const logsDiv = document.getElementById("logs");
    const logsPre = document.getElementById("logsPre");
    const logsResultsDiv = document.getElementById("logResults");
    const comparisonDiv = document.getElementById("comparison");

    logsResultsDiv.innerHTML = "";
    comparisonDiv.innerHTML = "";

    let allowedCount = 0;
    let blockedCount = 0;
    const allowedDomains = [];
    const blockedDomains = [];

    resultsArray.forEach(results => {
      results.forEach(data => {
        if (data.status === "error") {
          data.status = "blocked"; // Treat errors as blocked
        }
        logsResultsDiv.innerHTML += `Domain: ${data.domain} | Status: ${data.status}\n`;
        if (data.status === "allowed") {
          allowedCount++;
          allowedDomains.push(data.domain);
        } else if (data.status === "blocked") {
          blockedCount++;
          blockedDomains.push(data.domain);
        }
      });
    });

    if (allowedCount > 0) {
      comparisonDiv.innerHTML += `
        <div>
          <h3 class="flex items-center space-x-2">
            <svg id="checkIcon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" class="text-green-500" fill="currentColor">
            <path d="M12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12C22 17.5228 17.5228 22 12 22ZM12 20C16.4183 20 20 16.4183 20 12C20 7.58172 16.4183 4 12 4C7.58172 4 4 7.58172 4 12C4 16.4183 7.58172 20 12 20ZM11.0026 16L6.75999 11.7574L8.17421 10.3431L11.0026 13.1716L16.6595 7.51472L18.0737 8.92893L11.0026 16Z"></path>
            </svg>
            <span>Tidak Diblokir</span>
          </h3>
          <div class="font-mono text-gray-100">
            <div class="flex justify-between bg-gray-900 text-sm rounded-t-lg px-4 py-2">
              <div>${allowedCount} domains</div>
              <button class="copy-btn flex items-center space-x-1" onclick="copyToClipboard('allowedDomains', this)">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
                  <path d="M19 2H9C7.9 2 7 2.9 7 4V14H9V4H19V14H9V16H11V14H19C20.1 14 21 13.1 21 12V4C21 2.9 20.1 2 19 2ZM17 8L11.41 12.59L7.83 9L4 12.83L5.41 14.24L7.83 11.83L11.41 15.41L18.41 9.41L17 8ZM4 18V20H18V18H4Z"></path>
                </svg>
                <span>Copy</span>
              </button>
            </div>
            <pre id="allowedDomains" class="rounded-b-lg rounded-t-none mt-0"><code>${allowedDomains.join("\n")}</code></pre>
          </div>
        </div>`;
    } else {
      comparisonDiv.innerHTML += `
        <div>
          <h3 class="flex items-center space-x-2">
            <svg id="checkIcon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" class="text-green-500" fill="currentColor">
            <path d="M12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12C22 17.5228 17.5228 22 12 22ZM12 20C16.4183 20 20 16.4183 20 12C20 7.58172 16.4183 4 12 4C7.58172 4 4 7.58172 4 12C4 16.4183 7.58172 20 12 20ZM11.0026 16L6.75999 11.7574L8.17421 10.3431L11.0026 13.1716L16.6595 7.51472L18.0737 8.92893L11.0026 16Z"></path>
            </svg>
            <span>Tidak Diblokir</span>
          </h3>
          <div class="font-mono text-gray-100">
            <div class="flex justify-between bg-gray-900 text-sm rounded-t-lg px-4 py-2">
              <div>${allowedCount} domain</div>
              <button class="copy-btn flex items-center space-x-1" onclick="copyToClipboard('allowedDomains', this)">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
                  <path d="M19 2H9C7.9 2 7 2.9 7 4V14H9V4H19V14H9V16H11V14H19C20.1 14 21 13.1 21 12V4C21 2.9 20.1 2 19 2ZM17 8L11.41 12.59L7.83 9L4 12.83L5.41 14.24L7.83 11.83L11.41 15.41L18.41 9.41L17 8ZM4 18V20H18V18H4Z"></path>
                </svg>
                <span>Copy</span>
              </button>
            </div>
            <pre id="allowedDomains" class="rounded-b-lg rounded-t-none mt-0"><code>Kosong</code></pre>
          </div>
        </div>`;
    }

    if (blockedCount > 0) {
      comparisonDiv.innerHTML += `
        <div>
          <h3 class="flex items-center space-x-2">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" class="text-red-500" fill="currentColor">
              <path d="M12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12C22 17.5228 17.5228 22 12 22ZM12 20C16.4183 20 20 16.4183 20 12C20 7.58172 16.4183 4 12 4C7.58172 4 4 7.58172 4 12C4 16.4183 7.58172 20 12 20ZM12 10.5858L14.8284 7.75736L16.2426 9.17157L13.4142 12L16.2426 14.8284L14.8284 16.2426L12 13.4142L9.17157 16.2426L7.75736 14.8284L10.5858 12L7.75736 9.17157L9.17157 7.75736L12 10.5858Z"></path>
            </svg>
            <span>Diblokir</span>
          </h3>
          <div class="font-mono text-gray-100">
            <div class="flex justify-between bg-gray-900 text-sm rounded-t-lg px-4 py-2">
              <div>${blockedCount} domains</div>
              <button class="copy-btn flex items-center space-x-1" onclick="copyToClipboard('blockedDomains', this)">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
                  <path d="M19 2H9C7.9 2 7 2.9 7 4V14H9V4H19V14H9V16H11V14H19C20.1 14 21 13.1 21 12V4C21 2.9 20.1 2 19 2ZM17 8L11.41 12.59L7.83 9L4 12.83L5.41 14.24L7.83 11.83L11.41 15.41L18.41 9.41L17 8ZM4 18V20H18V18H4Z"></path>
                </svg>
                <span>Copy</span>
              </button>
            </div>
            <pre id="blockedDomains" class="rounded-b-lg rounded-t-none mt-0"><code>${blockedDomains.join("\n")}</code></pre>
          </div>
        </div>`;
    } else {
      comparisonDiv.innerHTML += `
        <div>
          <h3 class="flex items-center space-x-2">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" class="text-red-500" fill="currentColor">
              <path d="M12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12C22 17.5228 17.5228 22 12 22ZM12 20C16.4183 20 20 16.4183 20 12C20 7.58172 16.4183 4 12 4C7.58172 4 4 7.58172 4 12C4 16.4183 7.58172 20 12 20ZM12 10.5858L14.8284 7.75736L16.2426 9.17157L13.4142 12L16.2426 14.8284L14.8284 16.2426L12 13.4142L9.17157 16.2426L7.75736 14.8284L10.5858 12L7.75736 9.17157L9.17157 7.75736L12 10.5858Z"></path>
            </svg>
            <span>Diblokir</span>
          </h3>
          <div class="font-mono text-gray-100">
            <div class="flex justify-between bg-gray-900 text-sm rounded-t-lg px-4 py-2">
              <div>${blockedCount} domain</div>
              <button class="copy-btn flex items-center space-x-1" onclick="copyToClipboard('blockedDomains', this)">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
                  <path d="M19 2H9C7.9 2 7 2.9 7 4V14H9V4H19V14H9V16H11V14H19C20.1 14 21 13.1 21 12V4C21 2.9 20.1 2 19 2ZM17 8L11.41 12.59L7.83 9L4 12.83L5.41 14.24L7.83 11.83L11.41 15.41L18.41 9.41L17 8ZM4 18V20H18V18H4Z"></path>
                </svg>
                <span>Copy</span>
              </button>
            </div>
            <pre id="blockedDomains" class="rounded-b-lg rounded-t-none mt-0"><code>Tidak ada</code></pre>
          </div>
        </div>`;
    }

    logsDiv.classList.remove('hidden');
  })
  .catch(error => {
    console.error('Error checking domains:', error);
  });
}

function copyToClipboard(id, button) {
  const preElement = document.querySelector(`#${id}`);
  if (preElement) {
    const textToCopy = preElement.textContent;
    const tempTextArea = document.createElement("textarea");
    tempTextArea.value = textToCopy;
    document.body.appendChild(tempTextArea);
    tempTextArea.select();
    document.execCommand("copy");
    document.body.removeChild(tempTextArea);
    const allButtons = document.querySelectorAll(".copy-btn");
    allButtons.forEach(btn => btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
      <path d="M19 2H9C7.9 2 7 2.9 7 4V14H9V4H19V14H9V16H11V14H19C20.1 14 21 13.1 21 12V4C21 2.9 20.1 2 19 2ZM17 8L11.41 12.59L7.83 9L4 12.83L5.41 14.24L7.83 11.83L11.41 15.41L18.41 9.41L17 8ZM4 18V20H18V18H4Z"></path>
    </svg><span>Copy</span>`);
    button.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
      <path d="M19 2H9C7.9 2 7 2.9 7 4V14H9V4H19V14H9V16H11V14H19C20.1 14 21 13.1 21 12V4C21 2.9 20.1 2 19 2ZM17 8L11.41 12.59L7.83 9L4 12.83L5.41 14.24L7.83 11.83L11.41 15.41L18.41 9.41L17 8ZM4 18V20H18V18H4Z"></path>
    </svg><span>Copied</span>`;
  }
}

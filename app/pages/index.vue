<template>
  <div>
    <h2>Welcome to the Department of Soul Registry</h2>
    <div class="panel">
      <div class="panel-title">Notice to Applicants</div>
      <p>
        This office processes exactly one wish per applicant per visit. Your wish will be issued as a formal contract
        with standard terms. Review each clause. You may approve, strike, or amend any clause, or spend an available
        credit to compel disclosure of concealed terms.
      </p>
      <p>
        When the contract is acceptable, sign it. If it is not, you may leave. Leaving is permitted. Leaving is
        neither rewarded nor penalized. Leaving is simply recorded as a withdrawal.
      </p>
      <div class="button-row">
        <NuxtLink class="gov-button primary" to="/wish">Begin — Form 666-A</NuxtLink>
        <NuxtLink class="gov-button" to="/regulations">Read the Regulations</NuxtLink>
      </div>
    </div>

    <div class="panel">
      <div class="panel-title">Before You Are Seated</div>
      <table class="registry">
        <thead>
          <tr>
            <th>Item</th>
            <th>Requirement</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Wishes per visit</td>
            <td>One (1)</td>
          </tr>
          <tr>
            <td>Available credits</td>
            <td>Three (3), non-renewable</td>
          </tr>
          <tr>
            <td>Right to withdraw</td>
            <td>Absolute</td>
          </tr>
          <tr>
            <td>Appeals</td>
            <td>Denied</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

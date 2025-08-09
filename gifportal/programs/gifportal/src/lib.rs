use anchor_lang::prelude::*;
declare_id!("9kq89xbsiB6ZEzcBm2tGkCHwNjVDbStfxsFH1zp27qA3");

#[program]
pub mod gifportal {
    use super::*;

    pub fn start_stuff_off(ctx: Context<StartStuffOff>) -> Result<()> {
        let acct = &mut ctx.accounts.base_account;
        acct.total_gifs = 0;
        acct.gif_list   = Vec::new();
        Ok(())
    }

    pub fn add_gif(ctx: Context<AddGif>, gif_link: String) -> Result<()> {
        let acct = &mut ctx.accounts.base_account;
        let item = ItemStruct {
            gif_link,
            user_address: ctx.accounts.user.key(),
        };
        acct.gif_list.push(item);
        acct.total_gifs = acct.gif_list.len() as u64;
        Ok(())
    }
}

#[derive(Accounts)]
pub struct StartStuffOff<'info> {
    /// 8 + 8 + 4 + MAX_ITEMS*(4 + MAX_URL_LEN + 32) must be < 10240
    #[account(init, payer = user, space = 8 + 8 + 4 + MAX_ITEMS*(4 + MAX_URL_LEN + 32))]
    pub base_account: Account<'info, BaseAccount>,

    #[account(mut)]
    pub user: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct AddGif<'info> {
    #[account(mut)]
    pub base_account: Account<'info, BaseAccount>,

    pub user: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Debug, Clone, AnchorSerialize, AnchorDeserialize)]
pub struct ItemStruct {
    pub gif_link:     String,
    pub user_address: Pubkey,
}

#[account]
pub struct BaseAccount {
    pub total_gifs: u64,
    pub gif_list:   Vec<ItemStruct>,
}

// Tweak these so that 8+8+4 + ITEMS*(4+URL+32) <= 10240
const MAX_URL_LEN: usize = 200;
const MAX_ITEMS:   usize = 40;
